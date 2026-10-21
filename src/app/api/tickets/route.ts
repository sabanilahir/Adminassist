import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { title, description, priority, customerId, categoryId } = body;

    if (!title || !customerId) {
      return NextResponse.json({ error: "Title dan Customer wajib diisi" }, { status: 400 });
    }

    // 1. CARI KONTRAK AKTIF SECARA OTOMATIS BERDASARKAN CUSTOMER ID
    const activeContract = await prisma.contract.findFirst({
      where: { customerId: customerId },
      orderBy: { createdAt: "desc" }, // Ambil kontrak terbaru/aktif
    });

    // 2. Buat tracking ID unik
    const trackingId = "TKT-" + Math.floor(100000 + Math.random() * 900000);

    // 3. Simpan tiket dengan contractId yang ditemukan
    const newTicket = await prisma.ticket.create({
      data: {
        title,
        description,
        priority: priority || "MEDIUM",
        status: "NEW",
        trackingId,
        customerId,
        categoryId: categoryId || null,
        userId: session.user.id,
        // Masukkan ID kontrak jika ada, jika tidak biarkan null
        contractId: activeContract ? activeContract.id : null, 
      },
    });

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

    // Ambil semua tiket dengan relasi customer, category, user, dan assignedTo
    const tickets = await prisma.ticket.findMany({
      include: {
        customer: { select: { id: true, name: true, company: true } },
        category: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets for report:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}
