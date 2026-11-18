import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { prisma } from "@/lib/prisma";
import { compare } from "bcrypt-ts";
import { getAzureOAuthConfig } from "@/lib/azure-graph";

export const { handlers, signIn, signOut, auth } = NextAuth(async () => {
  const azureConfig = await getAzureOAuthConfig();

  const microsoftProvider = MicrosoftEntraID({
    clientId: azureConfig?.clientId || process.env.AUTH_MICROSOFT_ENTRA_ID_ID || "placeholder",
    clientSecret: azureConfig?.clientSecret || process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET || "placeholder",
    issuer: azureConfig?.tenantId
      ? `https://login.microsoftonline.com/${azureConfig.tenantId}/v2.0`
      : process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID
      ? `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`
      : "https://login.microsoftonline.com/common/v2.0",
  });

  return {
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    providers: [
      Credentials({
        credentials: {
          email: { label: "Email", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null;

          const rawEmail = (credentials.email as string).trim();
          const password = (credentials.password as string).trim();

          // 1. Search user (case-insensitive)
          let user = await prisma.user.findFirst({
            where: {
              email: {
                equals: rawEmail,
                mode: "insensitive",
              },
            },
          });

          // 2. Fallback alias mapping for convenience / demo (DEV ONLY with explicit ENABLE_DEMO_LOGIN)
          const isDemoAllowed =
            process.env.NODE_ENV !== "production" &&
            process.env.ENABLE_DEMO_LOGIN === "true";
          if (!user && isDemoAllowed) {
            const lower = rawEmail.toLowerCase();
            if (lower === "pm@helpdesk.com" || lower === "pm1@helpdesk.com") {
              user = await prisma.user.findFirst({
                where: { email: { equals: "pm1@suzuki.co.id", mode: "insensitive" } },
              });
            } else if (
              lower === "technical@email.com" ||
              lower === "pic1@helpdesk.com" ||
              lower === "pic@helpdesk.com"
            ) {
              user = await prisma.user.findFirst({
                where: { email: { equals: "user1@suzuki.co.id", mode: "insensitive" } },
              });
            } else if (lower === "pic2@helpdesk.com") {
              user = await prisma.user.findFirst({
                where: { email: { equals: "user2@suzuki.co.id", mode: "insensitive" } },
              });
            }
          }

          if (!user) return null;

          // 3. User bertipe MICROSOFT_365 wajib login melalui SSO Microsoft
          if (user.userType === "MICROSOFT_365") {
            return null;
          }

          if (!user.password) return null;

          // 4. Check password
          let match = await compare(password, user.password);

          // Support demo passwords only in non-production with demo enabled
          if (!match && isDemoAllowed) {
            if (password === "pm1234" && user.role === "PROJECT_MANAGER") {
              match = await compare("pm123", user.password);
            } else if (password === "tc1234" && user.role === "PIC") {
              match = await compare("pic123", user.password);
            }
          }

          if (!match) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            userType: user.userType,
          };
        },
      }),
      microsoftProvider,
    ],
    callbacks: {
      async signIn({ user, account }) {
        if (account?.provider === "microsoft-entra-id") {
          const config = await prisma.oAuthConfig.findUnique({
            where: { provider: "microsoft-entra-id" },
          });

          // Cek 1: OAuth enabled?
          if (!config?.isEnabled) {
            return "/login?error=OAuthDisabled";
          }

          // Cek 2: User email sudah terdaftar di database?
          if (!user?.email) {
            return "/login?error=InvalidEmail";
          }

          const existingUser = await prisma.user.findFirst({
            where: {
              email: {
                equals: user.email.trim(),
                mode: "insensitive",
              },
            },
          });

          if (!existingUser) {
            return "/login?error=UserNotRegistered";
          }
        }
        return true;
      },
      async jwt({ token, user }) {
        if (user) {
          const email = user.email || token.email;
          if (email) {
            const dbUser = await prisma.user.findFirst({
              where: {
                email: {
                  equals: email,
                  mode: "insensitive",
                },
              },
              select: { id: true, role: true, userType: true },
            });
            if (dbUser) {
              token.id = dbUser.id;
              token.role = dbUser.role;
              token.userType = dbUser.userType;
            }
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          (session.user as any).id = token.id as string;
          (session.user as any).role = token.role;
          (session.user as any).userType = token.userType;
        }
        return session;
      },
    },
  };
});
