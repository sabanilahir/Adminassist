"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Status } from "@prisma/client";
import { notifyPicClaimed, notifyStatusChanged, notifyPicAssigned } from "@/lib/ticket-notifications";

export async function updateTicket(id: string, data: any) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role === "USER") return { error: "Access denied" };

  const existingTicket = await prisma.ticket.findUnique({ where: { id } });
  if (!existingTicket) return { error: "Ticket not found" };

  if (existingTicket.status === Status.NOT_APPLICABLE && session.user.role !== "ADMIN") {
    return { error: "Tiket dengan status Not Applicable tidak dapat diedit lagi kecuali oleh Admin." };
  }

  // Siapkan payload update
  const payload: any = { ...data };

  // Konversi String Status ke Enum Prisma jika ada passing status
  if (data.status && typeof data.status === "string") {
    payload.status = Status[data.status as keyof typeof Status] || data.status;
  }

  if (payload.status === Status.RESOLVED) {
    const rootCause = payload.rootCause !== undefined ? payload.rootCause : existingTicket.rootCause;
    const resolution = payload.resolution !== undefined ? payload.resolution : existingTicket.resolution;

    if (!rootCause || !resolution || rootCause.trim() === "" || resolution.trim() === "") {
      return { error: "Root Cause Analysis dan Resolution wajib diisi sebelum menyelesaikan tiket." };
    }

    payload.resolvedAt = new Date();
  }

  await prisma.ticket.update({ where: { id }, data: payload });

  // Notifikasi: status berubah → PM
  if (data.status && data.status !== existingTicket.status) {
    notifyStatusChanged(id, existingTicket.status, data.status).catch(console.error);
  }

  // Notifikasi: PM assign PIC baru
  if (data.assignedToId && data.assignedToId !== existingTicket.assignedToId && session.user.role === "PROJECT_MANAGER") {
    notifyPicAssigned(id, data.assignedToId).catch(console.error);
  }

  revalidatePath("/tickets/" + id);
  revalidatePath("/tickets");
  revalidatePath("/inbox");

  return { success: true };
}

export async function claimTicket(ticketId: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "PIC") return { error: "Only PIC" };
  
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { error: "Not found" };
  if (ticket.assignedToId) return { error: "Already assigned" };
  
  await prisma.ticket.update({ 
    where: { id: ticketId }, 
    data: { 
      assignedToId: session.user.id, 
      status: Status.IN_PROGRESS 
    } 
  });

  // Notifikasi: PIC klaim tiket → PM
  notifyPicClaimed(ticketId, session.user.name ?? "", session.user.email ?? "").catch(console.error);
  
  revalidatePath("/tickets/" + ticketId);
  revalidatePath("/tickets");
  revalidatePath("/inbox");
  
  return { success: true };
}

export async function deleteTicket(id: string) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role !== "ADMIN") return { error: "Access denied" };
  
  await prisma.ticket.delete({ where: { id } });
  
  revalidatePath("/tickets");
  revalidatePath("/inbox");
  
  return { success: true };
}

export async function markTicketNotApplicable(ticketId: string, reason: string) {
  const session = await auth();
  
  if (session?.user?.role !== "PROJECT_MANAGER") {
    throw new Error("Unauthorized: Only Project Managers can perform this action");
  }

  if (!reason || reason.trim() === "") {
    throw new Error("Reason is required");
  }

  try {
    await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticketId },
        data: { status: Status.NOT_APPLICABLE },
      }),
      prisma.comment.create({
        data: {
          content: `[STATUS CHANGED TO NOT APPLICABLE]\nAlasan: ${reason}`,
          ticketId: ticketId,
          userId: session.user.id,
        },
      }),
    ]);

    revalidatePath(`/tickets/${ticketId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to mark as not applicable:", error);
    return { success: false, error: "Failed to update ticket" };
  }
}

export async function rejectTicket(
  ticketId: string, 
  proposedCategoryId: string, 
  reason: string
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "PIC" && session.user.role !== "PROJECT_MANAGER" && session.user.role !== "ADMIN")) {
      return { error: "Unauthorized" };
    }

    const userId = session.user.id;

    // 1. Catat komentar alasan reject
    await prisma.comment.create({
      data: {
        content: `[REJECTED & REROUTED] Alasan: ${reason}`,
        ticketId,
        userId,
      },
    });

    // 2. Ubah status menjadi REJECTED & lepas penugasan PIC
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: Status.REJECTED,
        assignedTo: { disconnect: true },
        category: proposedCategoryId ? { connect: { id: proposedCategoryId } } : undefined,
      },
    });

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/inbox");

    return { success: true, ticket: updatedTicket };
  } catch (error: any) {
    console.error("Error rejecting ticket:", error);
    return { error: error.message || "Gagal me-reject tiket" };
  }
}

// Tambahan: Aksi Admin mengirim ulang tiket dari REJECTED ke OPEN / IN_PROGRESS
export async function resubmitTicket(
  ticketId: string,
  categoryId: string,
  assignedToId?: string | null
) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return { error: "Hanya Admin yang dapat merevisi dan mengirim ulang tiket." };
    }

    const newStatus = assignedToId && assignedToId !== "unassigned" 
      ? Status.IN_PROGRESS 
      : Status.OPEN;

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        category: categoryId ? { connect: { id: categoryId } } : undefined,
        assignedTo: assignedToId && assignedToId !== "unassigned" 
          ? { connect: { id: assignedToId } } 
          : { disconnect: true },
      },
    });

    await prisma.comment.create({
      data: {
        content: `[RESUBMITTED BY ADMIN] Tiket telah diperbarui dan dikirim kembali. Status: ${newStatus}`,
        ticketId,
        userId: session.user.id,
      },
    });

    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/tickets");
    revalidatePath("/inbox");

    return { success: true, ticket: updatedTicket };
  } catch (error: any) {
    console.error("Error resubmitting ticket:", error);
    return { error: error.message || "Gagal mengirim ulang tiket" };
  }
}