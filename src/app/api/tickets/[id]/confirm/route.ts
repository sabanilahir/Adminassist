import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const ticket = await prisma.ticket.findUnique({ where: { id: params.id } });
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    
    if (ticket.status !== "RESOLVED") {
      return NextResponse.json({ error: "Ticket must be resolved first" }, { status: 400 });
    }
    
    const updatedTicket = await prisma.ticket.update({
      where: { id: params.id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedBy: session.user.email,
      },
    });
    
    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error) {
    console.error("Error confirming ticket:", error);
    return NextResponse.json({ error: "Failed to confirm ticket" }, { status: 500 });
  }
}
