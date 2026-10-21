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

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user || !user.password) return null

        const match = await compare(password, user.password)
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