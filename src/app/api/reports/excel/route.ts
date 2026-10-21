import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportTicketsToExcel } from "@/lib/excel-export";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await prisma.ticket.findMany({
      include: {
        user: {
          select: { name: true, email: true },
        },
        agent: {
          select: { name: true },
        },
        category: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const buffer = await exportTicketsToExcel(tickets);
    const filename = `tickets-report-${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting Excel:", error);
    return NextResponse.json(
      { error: "Failed to export Excel" },
      { status: 500 }
    );
  }
}