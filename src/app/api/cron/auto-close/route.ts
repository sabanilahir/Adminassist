import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Status } from "@prisma/client";

export async function GET(request: Request) {
  return handleAutoClose(request);
}

export async function POST(request: Request) {
  return handleAutoClose(request);
}

async function handleAutoClose(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");

    // Jika CRON_SECRET dikonfigurasi, lakukan verifikasi keamanan
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && searchParams.get("key") !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
    }

    const now = new Date();

    // Cari tiket berstatus RESOLVED yang telah melewati batas autoCloseAt
    const eligibleTickets = await prisma.ticket.findMany({
      where: {
        status: Status.RESOLVED,
        autoCloseAt: {
          lte: now,
        },
      },
      select: { id: true, trackingId: true },
    });

    if (eligibleTickets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Tidak ada tiket berstatus RESOLVED yang melewati batas auto-close.",
        closedCount: 0,
      });
    }

    let closedCount = 0;
    for (const t of eligibleTickets) {
      await prisma.$transaction([
        prisma.ticket.update({
          where: { id: t.id },
          data: { status: Status.CLOSED },
        }),
        prisma.ticketActivity.create({
          data: {
            ticketId: t.id,
            action: "AUTO_CLOSED",
            fromState: Status.RESOLVED,
            toState: Status.CLOSED,
            note: "Tiket ditutup otomatis oleh sistem setelah 7 hari berstatus RESOLVED tanpa sanggahan dari customer.",
          },
        }),
      ]);
      closedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menutup ${closedCount} tiket secara otomatis.`,
      closedTickets: eligibleTickets.map((t) => t.trackingId),
    });
  } catch (error: any) {
    console.error("Cron auto-close error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses auto-close tiket." },
      { status: 500 }
    );
  }
}
