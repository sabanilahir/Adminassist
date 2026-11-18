import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const config = await prisma.emailConfig.findFirst()

    return NextResponse.json(config || {
      provider: "smtp",
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpUser: "",
      smtpPass: "",
      smtpFrom: "",
      graphTenantId: "",
      graphClientId: "",
      graphClientSecret: "",
      graphSenderEmail: "",
      isEnabled: false,
    })
  } catch (error) {
    console.error("Error fetching email config:", error)
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
    const {
      provider = "smtp",
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      graphTenantId,
      graphClientId,
      graphClientSecret,
      graphSenderEmail,
      isEnabled,
    } = body

    const existing = await prisma.emailConfig.findFirst()

    const dataToSave = {
      provider: provider || "smtp",
      smtpHost: smtpHost || "smtp.gmail.com",
      smtpPort: parseInt(smtpPort) || 587,
      smtpUser: smtpUser || "",
      smtpPass: smtpPass || "",
      smtpFrom: smtpFrom || "",
      graphTenantId: graphTenantId || null,
      graphClientId: graphClientId || null,
      graphClientSecret: graphClientSecret || null,
      graphSenderEmail: graphSenderEmail || null,
      isEnabled: Boolean(isEnabled),
    }

    let config
    if (existing) {
      config = await prisma.emailConfig.update({
        where: { id: existing.id },
        data: dataToSave,
      })
    } else {
      config = await prisma.emailConfig.create({
        data: dataToSave,
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error updating email config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
