import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyNewTicket } from "@/lib/ticket-notifications";
import { calculateTicketDueDate } from "@/lib/sla-calculator";
import { Priority } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      title,
      description,
      priority,
      customerId,
      categoryId,
      contractId,
      reportedAt,
      reporterName,
      attachments,
    } = body;

    if (!title || !customerId) {
      return NextResponse.json({ error: "Title dan Customer wajib diisi" }, { status: 400 });
    }

    // 1. Gunakan contractId dari form jika ada, jika tidak cari kontrak aktif
    let resolvedContractId: string | null = contractId || null;
    if (!resolvedContractId) {
      const activeContract = await prisma.contract.findFirst({
        where: { customerId },
        orderBy: { createdAt: "desc" },
      });
      resolvedContractId = activeContract?.id ?? null;
    }

    // 2. Buat tracking ID berformat tahun-bulan
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const trackingId = `TKT-${yearMonth}-${randomSuffix}`;

    const reportedDate = reportedAt ? new Date(reportedAt) : new Date();
    const ticketPriority = (priority as Priority) || "MEDIUM";

    // 3. Hitung SLA target penyelesaian
    const dueDate = await calculateTicketDueDate(
      resolvedContractId,
      ticketPriority,
      reportedDate
    );

    // 4. Simpan tiket & catat audit trail
    const newTicket = await prisma.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          title,
          description,
          priority: ticketPriority,
          status: "NEW",
          trackingId,
          customerId,
          categoryId: categoryId || null,
          userId: session.user.id,
          contractId: resolvedContractId,
          reportedAt: reportedDate,
          reporterName: reporterName || null,
          dueDate,
          attachments: Array.isArray(attachments) ? attachments : [],
        },
      });

      await tx.ticketActivity.create({
        data: {
          ticketId: created.id,
          userId: session.user.id,
          action: "TICKET_CREATED",
          toState: "NEW",
          note: `Tiket dibuat dengan SLA target penyelesaian: ${dueDate.toLocaleString("id-ID")}`,
        },
      });

      return created;
    });

    // 5. Kirim notifikasi email ke PM & PIC (fire-and-forget)
    notifyNewTicket(newTicket.id).catch((err) =>
      console.error("[API /tickets POST] notifyNewTicket error:", err)
    );

    return NextResponse.json(newTicket, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ error: "Gagal membuat tiket" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tickets = await prisma.ticket.findMany({
      include: {
        customer: { select: { id: true, name: true, company: true } },
        category: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        contract: { select: { id: true, contractNumber: true, slaPolicy: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets for report:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}
