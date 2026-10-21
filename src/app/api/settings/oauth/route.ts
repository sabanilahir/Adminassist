import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const config = await prisma.oAuthConfig.findUnique({
      where: { provider: "microsoft-entra-id" }
    })

    return NextResponse.json(config || {
      provider: "microsoft-entra-id",
      isEnabled: false,
      clientId: null,
      clientSecret: null,
      tenantId: null,
    })
  } catch (error) {
    console.error("Error fetching OAuth config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { clientId, clientSecret, tenantId, isEnabled } = body

    const config = await prisma.oAuthConfig.upsert({
      where: { provider: "microsoft-entra-id" },
      update: { clientId, clientSecret, tenantId, isEnabled },
      create: {
        provider: "microsoft-entra-id",
        clientId,
        clientSecret,
        tenantId,
        isEnabled,
      }
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error updating OAuth config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}