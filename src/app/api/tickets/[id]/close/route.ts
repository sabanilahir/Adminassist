import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { rootCause, resolution, reference } = await request.json();
    
    if (!rootCause || !resolution) {
      return NextResponse.json({ error: "Root cause and resolution are required" }, { status: 400 });
    }
    
    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    
    // Update ticket with close form data
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        status: "RESOLVED",
        rootCause,
        resolution,
        reference: reference || null,
        resolvedAt: new Date(),
        autoCloseAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      },
    });
    
    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error) {
    console.error("Error closing ticket:", error);
    return NextResponse.json({ error: "Failed to close ticket" }, { status: 500 });
  }
}
