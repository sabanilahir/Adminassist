import ExcelJS from "exceljs";

interface Ticket {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category?: { name: string } | null;
  agent?: { name: string } | null;
  user: { name: string; email: string };
  createdAt: Date | string;
  updatedAt: Date | string;
}

export async function exportTicketsToExcel(tickets: Ticket[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Helpdesk System";
  workbook.created = new Date();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 20 },
  ];

  const statusCounts = tickets.reduce((acc, ticket) => {
    acc[ticket.status] = (acc[ticket.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityCounts = tickets.reduce((acc, ticket) => {
    acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  summarySheet.addRows([
    { metric: "Total Tickets", value: tickets.length },
    { metric: "Report Generated", value: new Date().toLocaleString() },
    { metric: "", value: "" },
    { metric: "By Status", value: "" },
    ...Object.entries(statusCounts).map(([status, count]) => ({
      metric: status.replace(/_/g, " "),
      value: count,
    })),
    { metric: "", value: "" },
    { metric: "By Priority", value: "" },
    ...Object.entries(priorityCounts).map(([priority, count]) => ({
      metric: priority,
      value: count,
    })),
  ]);

  // Sheet 2: Tickets
  const ticketsSheet = workbook.addWorksheet("Tickets");
  ticketsSheet.columns = [
    { header: "Tracking ID", key: "trackingId", width: 15 },
    { header: "Title", key: "title", width: 40 },
    { header: "Description", key: "description", width: 50 },
    { header: "Status", key: "status", width: 15 },
    { header: "Priority", key: "priority", width: 12 },
    { header: "Category", key: "category", width: 20 },
    { header: "Assigned To", key: "agent", width: 20 },
    { header: "Created By", key: "user", width: 20 },
    { header: "Created At", key: "createdAt", width: 18 },
    { header: "Updated At", key: "updatedAt", width: 18 },
  ];

  // Add headers with styling
  const headerRow = ticketsSheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Add data rows
  tickets.forEach((ticket) => {
    const row = ticketsSheet.addRow({
      trackingId: ticket.trackingId,
      title: ticket.title,
      description: ticket.description.substring(0, 200),
      status: ticket.status.replace(/_/g, " "),
      priority: ticket.priority,
      category: ticket.category?.name || "N/A",
      agent: ticket.agent?.name || "Unassigned",
      user: `${ticket.user.name} (${ticket.user.email})`,
      createdAt: formatDate(ticket.createdAt),
      updatedAt: formatDate(ticket.updatedAt),
    });

    // Color code status
    const statusCell = row.getCell("status");
    switch (ticket.status) {
      case "NEW":
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3498DB" } };
        break;
      case "IN_PROGRESS":
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF39C12" } };
        break;
      case "RESOLVED":
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF27AE60" } };
        break;
      case "ON_HOLD":
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE74C3C" } };
        break;
    }

    // Color code priority
    const priorityCell = row.getCell("priority");
    switch (ticket.priority) {
      case "HIGH":
        priorityCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE74C3C" } };
        priorityCell.font = { color: { argb: "FFFFFFFF" } };
        break;
      case "MEDIUM":
        priorityCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF39C12" } };
        break;
      case "LOW":
        priorityCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF27AE60" } };
        break;
    }
  });

  // Auto filter
  ticketsSheet.autoFilter = {
    from: "A1",
    to: "J1",
  };

  // Freeze header row
  ticketsSheet.views = [
    {
      state: "frozen",
      xSplit: 0,
      ySplit: 1,
    },
  ];

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export async function exportTicketsToCSV(tickets: Ticket[]): Promise<string> {
  const headers = [
    "Tracking ID",
    "Title",
    "Status",
    "Priority",
    "Category",
    "Assigned To",
    "Created By",
    "Created At",
  ];

  const rows = tickets.map((ticket) => [
    ticket.trackingId,
    `"${ticket.title.replace(/"/g, '""')}"`,
    ticket.status.replace(/_/g, " "),
    ticket.priority,
    ticket.category?.name || "N/A",
    ticket.agent?.name || "Unassigned",
    ticket.user.name,
    formatDate(ticket.createdAt),
  ]);

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  return csv;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}