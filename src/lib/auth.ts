import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"
import { prisma } from "@/lib/prisma"
import { compare } from "bcrypt-ts"

const tenantId = process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID

const microsoftProvider = MicrosoftEntraID({
  clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID || "placeholder",
  clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET || "placeholder",
  issuer: tenantId 
    ? `https://login.microsoftonline.com/${tenantId}/v2.0` 
    : "https://login.microsoftonline.com/common/v2.0",
})

export const { handlers, signIn, signOut, auth } = NextAuth({
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
        if (!credentials?.email || !credentials?.password) return null

        const rawEmail = (credentials.email as string).trim()
        const password = (credentials.password as string).trim()

        // 1. Search user (case-insensitive)
        let user = await prisma.user.findFirst({
          where: {
            email: {
              equals: rawEmail,
              mode: "insensitive",
            },
          },
        })

        // 2. Fallback alias mapping for convenience / demo
        if (!user) {
          const lower = rawEmail.toLowerCase()
          if (lower === "pm@helpdesk.com" || lower === "pm1@helpdesk.com") {
            user = await prisma.user.findFirst({
              where: { email: { equals: "pm1@suzuki.co.id", mode: "insensitive" } },
            })
          } else if (
            lower === "technical@email.com" ||
            lower === "pic1@helpdesk.com" ||
            lower === "pic@helpdesk.com"
          ) {
            user = await prisma.user.findFirst({
              where: { email: { equals: "user1@suzuki.co.id", mode: "insensitive" } },
            })
          } else if (lower === "pic2@helpdesk.com") {
            user = await prisma.user.findFirst({
              where: { email: { equals: "user2@suzuki.co.id", mode: "insensitive" } },
            })
          }
        }

        if (!user || !user.password) return null

        // 3. Check password
        let match = await compare(password, user.password)

        // Support demo passwords if user used passwords from demo label
        if (!match) {
          if (password === "pm1234" && user.role === "PROJECT_MANAGER") {
            match = await compare("pm123", user.password)
          } else if (password === "tc1234" && user.role === "PIC") {
            match = await compare("pic123", user.password)
          }
        }

        if (!match) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
    microsoftProvider,
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "microsoft-entra-id") {
        // Baca config dari database
        const config = await prisma.oAuthConfig.findUnique({
          where: { provider: "microsoft-entra-id" }
        })

        // Cek 1: OAuth enabled?
        if (!config?.isEnabled) {
          return false // OAuth belum aktif
        }

        // Cek 2: User email sudah terdaftar di database?
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! }
        })

        if (!existingUser) {
          return false // User belum register
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! }
        })
        token.role = dbUser?.role || "USER"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string
        (session.user as any).role = token.role
      }
      return session
    },
  },
})