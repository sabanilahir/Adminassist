import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, isInternal } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment cannot be empty" },
        { status: 400 }
      );
    }

    // Check ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Users can only comment on their own tickets
    if (session.user.role === "USER" && ticket.userId !== session.user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only agents/admins can add internal notes
    if (isInternal && session.user.role === "USER") {
      return NextResponse.json(
        { error: "Only agents can add internal notes" },
        { status: 403 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        isInternal: isInternal || false,
        ticketId: params.id,
        userId: session.user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Update ticket status to REPLIED if agent/admin replies
    if (session.user.role !== "USER") {
      await prisma.ticket.update({
        where: { id: params.id },
        data: { status: "REPLIED" },
      });
    }

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}