import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;
    if (!trackingId) {
      return NextResponse.json({ error: "Tracking ID wajib diisi." }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { trackingId: trackingId.trim() },
      select: {
        id: true,
        trackingId: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        reportedAt: true,
        dueDate: true,
        resolvedAt: true,
        resolution: true,
        attachments: true,
        customer: {
          select: { name: true, company: true },
        },
        category: {
          select: { name: true },
        },
        activities: {
          select: {
            id: true,
            action: true,
            fromState: true,
            toState: true,
            note: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: `Tiket dengan Tracking ID '${trackingId}' tidak ditemukan.` },
        { status: 404 }
      );
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Public track ticket error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memuat data tiket." },
      { status: 500 }
    );
  }
}

// Handler Konfirmasi Selesai oleh Customer
export async function POST(
  request: Request,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const { trackingId } = await params;
    const body = await request.json().catch(() => ({}));

    const ticket = await prisma.ticket.findUnique({
      where: { trackingId: trackingId.trim() },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });
    }

    if (ticket.status !== Status.RESOLVED) {
      return NextResponse.json(
        { error: "Hanya tiket berstatus RESOLVED yang dapat dikonfirmasi selesai." },
        { status: 400 }
      );
    }

    const customerNote = body.note ? ` Catatan customer: ${body.note}` : "";

    const updated = await prisma.$transaction([
      prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: Status.CONFIRMED,
          confirmedAt: new Date(),
        },
      }),
      prisma.ticketActivity.create({
        data: {
          ticketId: ticket.id,
          action: "CUSTOMER_CONFIRMED",
          fromState: Status.RESOLVED,
          toState: Status.CONFIRMED,
          note: `Penyelesaian tiket dikonfirmasi langsung oleh customer via portal tracking mandiri.${customerNote}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Terima kasih! Tiket berhasil dikonfirmasi selesai.",
      ticket: updated[0],
    });
  } catch (error: any) {
    console.error("Customer confirm error:", error);
    return NextResponse.json(
      { error: "Gagal mengonfirmasi penyelesaian tiket." },
      { status: 500 }
    );
  }
}
