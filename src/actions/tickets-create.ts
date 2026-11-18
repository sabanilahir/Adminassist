"use server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { notifyNewTicket } from "@/lib/ticket-notifications";
import { CreateTicketSchema } from "@/lib/validations/ticket";
import { calculateTicketDueDate } from "@/lib/sla-calculator";
import { Priority } from "@prisma/client";

function generateSequentialTrackingId(): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const randomSuffix = Math.floor(10000 + Math.random() * 90000); // 5 digit angka
  return `TKT-${yearMonth}-${randomSuffix}`;
}

export async function createTicket(formData: FormData) {
  const session = await auth();
  if (!session) return { error: "Unauthorized" };
  if (session.user.role === "USER") return { error: "Access denied" };

  // Parse attachments from FormData
  const attachmentsRaw = formData.getAll("attachments") as string[];
  const attachments = attachmentsRaw.filter((a) => typeof a === "string" && a.trim().length > 0);

  // 1. Validasi Input Menggunakan Zod
  const rawData = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    priority: (formData.get("priority") as string) || "MEDIUM",
    categoryId: (formData.get("categoryId") as string) || null,
    customerId: formData.get("customerId") as string,
    contractId: (formData.get("contractId") as string) || null,
    reporterName: (formData.get("reporterName") as string) || null,
    reportedAt: (formData.get("reportedAt") as string) || null,
    attachments,
  };

  const parsed = CreateTicketSchema.safeParse(rawData);
  if (!parsed.success) {
    const errorMsg = parsed.error.errors.map((e) => e.message).join(", ");
    return { error: errorMsg };
  }

  const data = parsed.data;
  let assignedToId: string | null = null;

  // Cek apakah kategori yang dipilih adalah "Feature Request"
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (category && category.name.toLowerCase().includes("feature request")) {
      const contract = data.contractId
        ? await prisma.contract.findUnique({ where: { id: data.contractId } })
        : await prisma.contract.findFirst({ where: { customerId: data.customerId } });

      if (contract?.projectManagerId) {
        assignedToId = contract.projectManagerId;
      }
    }
  }

  // 2. Generate Tracking ID yang collision-resistant
  let trackingId = generateSequentialTrackingId();
  let attempts = 0;
  while (attempts < 10) {
    const existing = await prisma.ticket.findUnique({ where: { trackingId } });
    if (!existing) break;
    trackingId = generateSequentialTrackingId();
    attempts++;
  }

  const reportedDate = data.reportedAt ? new Date(data.reportedAt) : new Date();

  // 3. Kalkulasi SLA Due Date Berdasarkan Kontrak Customer
  const dueDate = await calculateTicketDueDate(
    data.contractId,
    data.priority as Priority,
    reportedDate
  );

  // 4. Buat Tiket dan Catat Audit Trail secara Transaksional
  const ticket = await prisma.$transaction(async (tx) => {
    const newTicket = await tx.ticket.create({
      data: {
        trackingId,
        title: data.title,
        description: data.description,
        priority: data.priority as Priority,
        userId: session.user.id,
        categoryId: data.categoryId || null,
        customerId: data.customerId,
        contractId: data.contractId || null,
        reportedAt: reportedDate,
        reporterName: data.reporterName || null,
        status: "NEW",
        assignedToId: assignedToId,
        dueDate,
        attachments: data.attachments,
      },
    });

    await tx.ticketActivity.create({
      data: {
        ticketId: newTicket.id,
        userId: session.user.id,
        action: "TICKET_CREATED",
        toState: "NEW",
        note: `Tiket dibuat dengan prioritas ${data.priority}. Target SLA: ${dueDate.toLocaleString("id-ID")}`,
      },
    });

    return newTicket;
  });

  revalidatePath("/tickets");
  revalidatePath("/");
  revalidatePath("/inbox");

  // Send email notifications to PM and PICs (fire-and-forget non-blocking)
  notifyNewTicket(ticket.id).catch(console.error);

  return { success: true, ticket };
}
