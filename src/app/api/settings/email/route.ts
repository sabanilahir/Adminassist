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
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      smtpUser: "",
      smtpPass: "",
      smtpFrom: "",
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
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, isEnabled } = body

    // Delete existing configs first
    await prisma.emailConfig.deleteMany()

    const config = await prisma.emailConfig.create({
      data: {
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpUser,
        smtpPass,
        smtpFrom,
        isEnabled,
      }
    })

    return NextResponse.json(config)
  } catch (error) {
    console.error("Error updating email config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}