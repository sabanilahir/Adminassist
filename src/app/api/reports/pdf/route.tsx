import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    const userId = session.user.id;

    // Tentukan filter berdasarkan role
    let ticketFilter: any = {};

    if (role === "PROJECT_MANAGER") {
      ticketFilter = {
        contract: {
          projectManagerId: userId,
        },
      };
    } else if (role === "PIC") {
      ticketFilter = {
        assignedToId: userId,
      };
    }

    const searchParams = request.nextUrl.searchParams;
    const theme = searchParams.get("theme") || "light";
    const isDark = theme === "dark";

    const tickets = await prisma.ticket.findMany({
      where: ticketFilter,
      include: {
        user: {
          select: { name: true },
        },
        category: {
          select: { name: true },
        },
        contract: {
          select: { 
            contractNumber: true, 
            projectManagerId: true,
            contactName: true, // <-- Ditambahkan di sini agar PIC / contactName ikut ditarik
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const statusCounts = tickets.reduce((acc: Record<string, number>, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});

    const stats = {
      totalTickets: tickets.length,
      newTickets: statusCounts["NEW"] || 0,
      notApplicableTickets: statusCounts["NOT_APPLICABLE"] || 0,
      resolvedTickets: statusCounts["RESOLVED"] || 0,
      highPriorityTickets: tickets.filter(t => t.priority === "HIGH").length,
    };

    // Theme colors
    const colors = {
      background: isDark ? "#1a1a1a" : "#ffffff",
      text: isDark ? "#ffffff" : "#333333",
      muted: isDark ? "#888888" : "#666666",
      tableBg: isDark ? "#2a2a2a" : "#f5f5f5",
      tableBorder: isDark ? "#444444" : "#dddddd",
      rowBorder: isDark ? "#333333" : "#eeeeee",
    };

    // Create PDF with promise-based approach
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4" }) as PDFKit.PDFDocument;
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on("error", (err) => {
        reject(err);
      });

      // Set background color (pdfkit supports this)
      if (isDark) {
        doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.background);
      }

      // Use built-in Courier font (no external files needed)
      doc.font("Courier-Bold");
      doc.fontSize(24);
      doc.fillColor(colors.text);
      doc.text("Helpdesk Ticket Report", { align: "center" });
      doc.moveDown(0.5);
      
      doc.font("Courier");
      doc.fontSize(12);
      doc.fillColor(colors.muted);
      doc.text(`Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, { align: "center" });
      doc.moveDown(1);

      // Stats boxes
      const boxWidth = 90;
      const boxHeight = 50;
      const startX = 50;
      const startY = doc.y;
      const gap = 10;

      const statsData = [
        { label: "Total", value: stats.totalTickets, color: isDark ? "#ffffff" : "#333333" },
        { label: "New", value: stats.newTickets, color: "#3498DB" },
        { label: "Not Applicable", value: stats.notApplicableTickets, color: "#6b7280" },
        { label: "Resolved", value: stats.resolvedTickets, color: "#27AE60" },
        { label: "High Priority", value: stats.highPriorityTickets, color: "#E74C3C" },
      ];

      statsData.forEach((stat, index) => {
        const x = startX + index * (boxWidth + gap);
        doc.rect(x, startY, boxWidth, boxHeight).stroke(colors.tableBorder);
        doc.font("Courier");
        doc.fontSize(10);
        doc.fillColor(colors.muted);
        doc.text(stat.label, x, startY + 8, { width: boxWidth, align: "center" });
        doc.font("Courier-Bold");
        doc.fontSize(18);
        doc.fillColor(stat.color);
        doc.text(stat.value.toString(), x, startY + 20, { width: boxWidth, align: "center" });
      });

      doc.y = startY + boxHeight + 30;

      // Table Header
      const tableTop = doc.y;
      const colWidths = [80, 150, 80, 60, 70, 80];
      const headers = ["ID", "Title", "Status", "Priority", "Category", "Created"];

      doc.rect(startX, tableTop, colWidths.reduce((a, b) => a + b, 0), 25).fill(colors.tableBg);
      doc.font("Courier-Bold");
      doc.fontSize(10);
      doc.fillColor(colors.text);

      let xPos = startX + 5;
      headers.forEach((header, index) => {
        doc.text(header, xPos, tableTop + 8, { width: colWidths[index] - 10 });
        xPos += colWidths[index];
      });

      doc.y = tableTop + 25;

      // Table Rows
      doc.font("Courier");
      doc.fontSize(9);
      doc.fillColor(colors.text);

      tickets.forEach((ticket) => {
        if (doc.y > 750) {
          doc.addPage();
          // Set background for new page in dark mode
          if (isDark) {
            doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.background);
          }
          doc.y = 50;
        }

        const rowY = doc.y;
        doc.rect(startX, rowY, colWidths.reduce((a, b) => a + b, 0), 20).stroke(colors.rowBorder);

        xPos = startX + 5;
        const rowData = [
          ticket.trackingId,
          ticket.title.substring(0, 25) + (ticket.title.length > 25 ? "..." : ""),
          ticket.status.replace(/_/g, " "),
          ticket.priority,
          ticket.category?.name || "N/A",
          new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        ];

        rowData.forEach((cell, idx) => {
          doc.text(cell, xPos, rowY + 6, { width: colWidths[idx] - 10 });
          xPos += colWidths[idx];
        });

        doc.y += 20;
      });

      // Footer
      doc.font("Courier");
      doc.fontSize(10);
      doc.fillColor(colors.muted);
      doc.text(
        `Total ${tickets.length} tickets | Helpdesk Ticketing System`,
        50,
        doc.page.height - 50,
        { align: "center", width: doc.page.width - 100 }
      );

      doc.end();
    });

    const filename = `tickets-report-${theme}-${new Date().toISOString().split("T")[0]}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}