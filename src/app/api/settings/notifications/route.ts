import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templates = await prisma.notificationTemplate.findMany()

    // Return default templates if none exist
    if (templates.length === 0) {
      return NextResponse.json([
        {
          type: "ticket_created",
          subject: "[ASSIST] New Ticket Created - {trackingId}",
          body: getDefaultTicketCreatedBody()
        },
        {
          type: "status_changed",
          subject: "[ASSIST] Ticket Status Updated - {trackingId}",
          body: getDefaultStatusChangedBody()
        }
      ])
    }

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error fetching templates:", error)
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
    const { type, subject, body: templateBody } = body

    const template = await prisma.notificationTemplate.upsert({
      where: { type },
      update: { subject, body: templateBody },
      create: { type, subject, body: templateBody }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error("Error updating template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getDefaultTicketCreatedBody(): string {
  return `A new ticket has been created in the system.

Ticket Information:
- Tracking ID: {trackingId}
- Title: {title}
- Priority: {priority}
- Created By: {createdBy}
- Created At: {createdAt}

Description:
{description}

{{#if assignedTo}}
This ticket has been assigned to: {assignedTo}
{{/if}}

Please check the system for more details.`
}

function getDefaultStatusChangedBody(): string {
  return `A ticket status has been updated.

Ticket Information:
- Tracking ID: {trackingId}
- Title: {title}
- Old Status: {oldStatus}
- New Status: {newStatus}
- Updated By: {updatedBy}
- Updated At: {updatedAt}

{{#if assignedTo}}
Assigned To: {assignedTo}
{{/if}}

Please check the system for more details.`
}