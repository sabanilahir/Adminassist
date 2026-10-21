"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function addComment(ticketId: string, formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const content = formData.get("content") as string;
  const isInternal = formData.get("isInternal") === "true";

  if (!content || content.trim().length === 0) {
    return { error: "Comment cannot be empty" };
  }

  // Check ticket exists and user has access
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    return { error: "Ticket not found" };
  }

  // Users can only comment on their own tickets
  if (session.user.role === "USER" && ticket.userId !== session.user.id) {
    return { error: "Access denied" };
  }

  // Only agents and admins can add internal notes
  if (isInternal && session.user.role === "USER") {
    return { error: "Only agents can add internal notes" };
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      isInternal,
      ticketId,
      userId: session.user.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  // Update ticket status to REPLIED if agent/agent replies
  if (session.user.role !== "USER") {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: "REPLIED",
      },
    });
  }

  revalidatePath(`/tickets/${ticketId}`);

  return { success: true, comment };
}

export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { ticket: true },
  });

  if (!comment) {
    return { error: "Comment not found" };
  }

  // Users can delete their own comments
  // Agents can delete their own comments
  // Admins can delete any comment
  if (
    comment.userId !== session.user.id &&
    session.user.role !== "ADMIN"
  ) {
    return { error: "Access denied" };
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  revalidatePath(`/tickets/${comment.ticketId}`);

  return { success: true };
}