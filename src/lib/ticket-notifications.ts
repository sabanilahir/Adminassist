/**
 * ticket-notifications.ts
 * 
 * Centralized email notification helpers for ticket events.
 * 
 * Events covered:
 * 1. New ticket created  → notify PM & all PICs on the related contract
 * 2. PIC claims a ticket → notify PM
 * 3. Ticket status changed → notify PM
 * 4. PM assigns ticket to a PIC → notify the assigned PIC
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Shared HTML wrapper
// ---------------------------------------------------------------------------
function wrapHtml(content: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;text-align:center;border-radius:10px 10px 0 0;">
        <h1 style="color:white;margin:0;font-size:22px;">ASSIST – Helpdesk System</h1>
      </div>
      <div style="background:#ffffff;padding:30px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 10px 10px;">
        ${content}
      </div>
      <div style="text-align:center;padding:16px;color:#888;font-size:12px;">
        This is an automated message – please do not reply.
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Shared ticket detail table
// ---------------------------------------------------------------------------
function ticketTable(ticket: any): string {
  const fmt = (d: Date | string | null | undefined) =>
    d ? new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(new Date(d)) : "-";

  const priorityColor =
    ticket.priority === "HIGH" ? "#e53e3e" : ticket.priority === "MEDIUM" ? "#dd6b20" : "#3182ce";

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-weight:bold;width:160px;color:#555;">Tracking ID</td>
        <td style="padding:8px;"><strong>${ticket.trackingId}</strong></td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-weight:bold;color:#555;">Title</td>
        <td style="padding:8px;">${ticket.title}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-weight:bold;color:#555;">Status</td>
        <td style="padding:8px;"><span style="background:#4caf50;color:white;padding:3px 10px;border-radius:4px;">${ticket.status}</span></td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-weight:bold;color:#555;">Priority</td>
        <td style="padding:8px;"><span style="background:${priorityColor};color:white;padding:3px 10px;border-radius:4px;">${ticket.priority}</span></td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-weight:bold;color:#555;">Customer</td>
        <td style="padding:8px;">${ticket.customer?.company || ticket.customer?.name || "-"}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-weight:bold;color:#555;">Contract</td>
        <td style="padding:8px;">${ticket.contract?.contractNumber || "No Contract"}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-weight:bold;color:#555;">Category</td>
        <td style="padding:8px;">${ticket.category?.name || "Uncategorized"}</td>
      </tr>
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-weight:bold;color:#555;">Description</td>
        <td style="padding:8px;">${ticket.description}</td>
      </tr>
      ${ticket.reporterName ? `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-weight:bold;color:#555;">Nama Pelapor</td>
        <td style="padding:8px;">${ticket.reporterName}</td>
      </tr>` : ""}
      ${ticket.reportedAt ? `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;font-weight:bold;color:#555;">Tgl Pelaporan</td>
        <td style="padding:8px;">${fmt(ticket.reportedAt)}</td>
      </tr>` : ""}
      </tr>
      <tr>
        <td style="padding:8px;font-weight:bold;color:#555;">Created At</td>
        <td style="padding:8px;">${fmt(ticket.createdAt)}</td>
      </tr>
    </table>
  `;
}

// ---------------------------------------------------------------------------
// Helper: load full ticket with all relations needed for notifications
// ---------------------------------------------------------------------------
async function loadTicketFull(ticketId: string) {
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true } },
      customer: { select: { id: true, customerCode: true, name: true, company: true, email: true } },
      contract: {
        include: {
          projectManager: { select: { id: true, name: true, email: true } },
          pics: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 1. New ticket created → PM + all PICs on the related contract
// ---------------------------------------------------------------------------
export async function notifyNewTicket(ticketId: string) {
  try {
    const ticket = await loadTicketFull(ticketId);
    if (!ticket) return;

    const contract = ticket.contract;
    const recipients: { name: string; email: string }[] = [];

    // PM
    if (contract?.projectManager?.email) {
      recipients.push(contract.projectManager);
    }

    // All PICs on contract (avoid duplicate if PM is also PIC)
    if (contract?.pics?.length) {
      for (const pic of contract.pics) {
        if (!recipients.find((r) => r.email === pic.email)) {
          recipients.push(pic);
        }
      }
    }

    if (recipients.length === 0) return;

    const subject = `[ASSIST] Tiket Baru: ${ticket.trackingId} – ${ticket.title}`;
    const html = wrapHtml(`
      <h2 style="color:#333;margin-top:0;">Laporan Tiket Baru</h2>
      <p>Halo <strong>{{NAME}}</strong>,</p>
      <p>Terdapat tiket baru yang masuk ke sistem dan memerlukan perhatian Anda.</p>
      ${ticketTable(ticket)}
      <p style="color:#888;font-size:13px;">Silakan login ke sistem ASSIST untuk meninjau dan menindaklanjuti tiket ini.</p>
    `);

    for (const r of recipients) {
      await sendEmail(r.email, subject, html.replace("{{NAME}}", r.name));
    }
  } catch (err) {
    console.error("[notifyNewTicket] Error:", err);
  }
}

// ---------------------------------------------------------------------------
// 2. PIC claims a ticket → notify PM
// ---------------------------------------------------------------------------
export async function notifyPicClaimed(ticketId: string, picName: string, picEmail: string) {
  try {
    const ticket = await loadTicketFull(ticketId);
    if (!ticket) return;

    const pm = ticket.contract?.projectManager;
    if (!pm?.email) return;

    const now = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(new Date());
    const subject = `[ASSIST] Tiket ${ticket.trackingId} Diklaim oleh PIC`;
    const html = wrapHtml(`
      <h2 style="color:#333;margin-top:0;">Tiket Diklaim oleh PIC</h2>
      <p>Halo <strong>${pm.name}</strong>,</p>
      <p>Tiket berikut telah diklaim oleh PIC dan sedang dalam pengerjaan.</p>
      ${ticketTable(ticket)}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px;font-weight:bold;color:#555;width:160px;">PIC yang Mengklaim</td>
          <td style="padding:8px;">${picName} (${picEmail})</td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:bold;color:#555;">Tanggal Klaim</td>
          <td style="padding:8px;">${now}</td>
        </tr>
      </table>
      <p style="color:#888;font-size:13px;">Tiket kini berstatus <strong>IN_PROGRESS</strong>.</p>
    `);

    await sendEmail(pm.email, subject, html);
  } catch (err) {
    console.error("[notifyPicClaimed] Error:", err);
  }
}

// ---------------------------------------------------------------------------
// 3. Ticket status changed → notify Customer & PM
// ---------------------------------------------------------------------------
export async function notifyStatusChanged(ticketId: string, oldStatus: string, newStatus: string) {
  try {
    const ticket = await loadTicketFull(ticketId);
    if (!ticket) return;

    const now = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(new Date());

    // 1. Kirim notifikasi ke Customer & Pelapor
    const customerRecipients: { name: string; email: string }[] = [];
    if (ticket.customer?.email) {
      customerRecipients.push({
        name: ticket.customer.name || ticket.customer.company || "Customer",
        email: ticket.customer.email,
      });
    }
    if (ticket.contract?.contactEmail && !customerRecipients.some((r) => r.email === ticket.contract?.contactEmail)) {
      customerRecipients.push({
        name: ticket.contract.contactName || "Customer",
        email: ticket.contract.contactEmail,
      });
    }
    if (ticket.user?.email && !customerRecipients.some((r) => r.email === ticket.user.email)) {
      customerRecipients.push({
        name: ticket.user.name || "Customer",
        email: ticket.user.email,
      });
    }

    const resolutionHtml = newStatus === "RESOLVED" && ticket.resolution ? `
      <div style="margin-top:16px;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;">
        <h4 style="margin:0 0 8px 0;color:#166534;">Informasi Penyelesaian Tiket (Resolution):</h4>
        <p style="margin:0;font-size:14px;color:#15803d;white-space:pre-wrap;">${ticket.resolution}</p>
      </div>
    ` : "";

    const customerSubject = `[ASSIST] Update Status Tiket ${ticket.trackingId}: ${newStatus}`;
    const customerHtml = wrapHtml(`
      <h2 style="color:#333;margin-top:0;">Pembaruan Status Tiket Anda</h2>
      <p>Halo <strong>{{NAME}}</strong>,</p>
      <p>Status tiket pengaduan Anda telah diperbarui menjadi <strong>${newStatus}</strong>.</p>
      ${ticketTable({ ...ticket, status: newStatus })}
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px;font-weight:bold;color:#555;width:160px;">Status Sebelumnya</td>
          <td style="padding:8px;"><span style="text-decoration:line-through;color:#999;">${oldStatus}</span></td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px;font-weight:bold;color:#555;">Status Terkini</td>
          <td style="padding:8px;"><span style="background:#4caf50;color:white;padding:3px 10px;border-radius:4px;">${newStatus}</span></td>
        </tr>
        <tr>
          <td style="padding:8px;font-weight:bold;color:#555;">Waktu Perubahan</td>
          <td style="padding:8px;">${now}</td>
        </tr>
      </table>
      ${resolutionHtml}
      <p style="color:#888;font-size:13px;margin-top:16px;">Anda dapat memeriksa riwayat dan perkembangan tiket melalui portal bantuan ASSIST.</p>
    `);

    for (const r of customerRecipients) {
      await sendEmail(r.email, customerSubject, customerHtml.replace("{{NAME}}", r.name));
    }

    // 2. Kirim notifikasi ke Project Manager (Internal)
    const pm = ticket.contract?.projectManager;
    if (pm?.email) {
      const pmSubject = `[ASSIST] Status Tiket ${ticket.trackingId} Berubah: ${oldStatus} → ${newStatus}`;
      const pmHtml = wrapHtml(`
        <h2 style="color:#333;margin-top:0;">Perubahan Status Tiket</h2>
        <p>Halo <strong>${pm.name}</strong>,</p>
        <p>Status tiket berikut telah diperbarui.</p>
        ${ticketTable({ ...ticket, status: newStatus })}
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:8px;font-weight:bold;color:#555;width:160px;">Status Lama</td>
            <td style="padding:8px;"><span style="text-decoration:line-through;color:#999;">${oldStatus}</span></td>
          </tr>
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:8px;font-weight:bold;color:#555;">Status Baru</td>
            <td style="padding:8px;"><span style="background:#4caf50;color:white;padding:3px 10px;border-radius:4px;">${newStatus}</span></td>
          </tr>
          <tr>
            <td style="padding:8px;font-weight:bold;color:#555;">Tanggal Perubahan</td>
            <td style="padding:8px;">${now}</td>
          </tr>
        </table>
        ${resolutionHtml}
      `);
      await sendEmail(pm.email, pmSubject, pmHtml);
    }
  } catch (err) {
    console.error("[notifyStatusChanged] Error:", err);
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 3b. Ticket rejected by PM / PIC → notify ADMIN_TICKET with Reason
// ---------------------------------------------------------------------------
export async function notifyTicketRejected(ticketId: string, reason: string, rejectedByName?: string) {
  try {
    const ticket = await loadTicketFull(ticketId);
    if (!ticket) return;

    // Ambil semua user dengan role ADMIN_TICKET (jika belum ada, fallback ke ADMIN)
    let adminTickets = await prisma.user.findMany({
      where: { role: "ADMIN_TICKET" },
      select: { id: true, name: true, email: true },
    });

    if (adminTickets.length === 0) {
      adminTickets = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true, name: true, email: true },
      });
    }

    const recipients: { name: string; email: string }[] = [...adminTickets];

    // Tembuskan juga ke PM kontrak jika ada dan belum ada di list
    const pm = ticket.contract?.projectManager;
    if (pm?.email && !recipients.some((r) => r.email === pm.email)) {
      recipients.push(pm);
    }

    if (recipients.length === 0) return;

    const subject = `[ASSIST] Tiket ${ticket.trackingId} Di-Reject oleh ${rejectedByName || "Tim Teknis"}`;
    const html = wrapHtml(`
      <h2 style="color:#dc2626;margin-top:0;">Pemberitahuan Penolakan Tiket (Reject)</h2>
      <p>Halo <strong>{{NAME}}</strong>,</p>
      <p>Tiket pengaduan dengan nomor pelacakan <strong>${ticket.trackingId}</strong> telah <strong>DI-REJECT</strong> oleh ${rejectedByName || "tim teknis"}.</p>
      <p>Mohon Admin Tiket untuk memeriksa detail tiket dan melakukan penyesuaian kategori atau data tiket sesuai kebutuhan.</p>
      ${ticketTable({ ...ticket, status: "REJECTED" })}
      <div style="margin:20px 0;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-left:5px solid #ef4444;border-radius:4px;">
        <h4 style="margin:0 0 6px 0;color:#991b1b;font-size:15px;">Alasan Reject:</h4>
        <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.5;white-space:pre-wrap;">${reason}</p>
        ${rejectedByName ? `<p style="margin:8px 0 0 0;font-size:12px;color:#991b1b;font-style:italic;">Ditolak oleh: ${rejectedByName}</p>` : ""}
      </div>
      <p style="color:#666;font-size:13px;">Silakan login ke portal ASSIST untuk meninjau dan mengirim ulang tiket ini.</p>
    `);

    for (const r of recipients) {
      await sendEmail(r.email, subject, html.replace("{{NAME}}", r.name));
    }
  } catch (err) {
    console.error("[notifyTicketRejected] Error:", err);
  }
}

// ---------------------------------------------------------------------------
// 3c. Ticket marked as NOT APPLICABLE by PM → notify Customer with Reason
// ---------------------------------------------------------------------------
export async function notifyTicketNotApplicable(ticketId: string, reason: string, pmName?: string) {
  try {
    const ticket = await loadTicketFull(ticketId);
    if (!ticket) return;

    const customerRecipients: { name: string; email: string }[] = [];
    if (ticket.customer?.email) {
      customerRecipients.push({
        name: ticket.customer.name || ticket.customer.company || "Customer",
        email: ticket.customer.email,
      });
    }
    if (ticket.contract?.contactEmail && !customerRecipients.some((r) => r.email === ticket.contract?.contactEmail)) {
      customerRecipients.push({
        name: ticket.contract.contactName || "Customer",
        email: ticket.contract.contactEmail,
      });
    }
    if (ticket.user?.email && !customerRecipients.some((r) => r.email === ticket.user.email)) {
      customerRecipients.push({
        name: ticket.user.name || "Customer",
        email: ticket.user.email,
      });
    }

    const subject = `[ASSIST] Tiket ${ticket.trackingId} Dinyatakan Not Applicable`;
    const html = wrapHtml(`
      <h2 style="color:#dc2626;margin-top:0;">Pemberitahuan Status Tiket: Not Applicable</h2>
      <p>Halo <strong>{{NAME}}</strong>,</p>
      <p>Tiket pengaduan Anda dengan nomor pelacakan <strong>${ticket.trackingId}</strong> telah ditinjau dan dinyatakan <strong>NOT APPLICABLE</strong> (Tidak Dapat Diterapkan / Di Luar Lingkup) oleh Project Manager.</p>
      ${ticketTable({ ...ticket, status: "NOT_APPLICABLE" })}
      <div style="margin:20px 0;padding:16px;background:#fff1f2;border:1px solid #fecdd3;border-left:5px solid #e11d48;border-radius:4px;">
        <h4 style="margin:0 0 6px 0;color:#9f1239;font-size:15px;">Alasan Not Applicable:</h4>
        <p style="margin:0;font-size:14px;color:#881337;line-height:1.5;white-space:pre-wrap;">${reason}</p>
        ${pmName ? `<p style="margin:8px 0 0 0;font-size:12px;color:#9f1239;font-style:italic;">Diputuskan oleh Project Manager: ${pmName}</p>` : ""}
      </div>
      <p style="color:#666;font-size:13px;">Jika Anda memerlukan informasi atau klarifikasi lebih lanjut mengenai keputusan ini, silakan hubungi Project Manager atau Account Manager terkait.</p>
    `);

    for (const r of customerRecipients) {
      await sendEmail(r.email, subject, html.replace("{{NAME}}", r.name));
    }

    // Tembusan ke PM
    const pm = ticket.contract?.projectManager;
    if (pm?.email && !customerRecipients.some((r) => r.email === pm.email)) {
      await sendEmail(pm.email, subject, html.replace("{{NAME}}", pm.name));
    }
  } catch (err) {
    console.error("[notifyTicketNotApplicable] Error:", err);
  }
}

// ---------------------------------------------------------------------------
// 4. PM assigns ticket to PIC → notify the PIC
// ---------------------------------------------------------------------------
export async function notifyPicAssigned(ticketId: string, picId: string) {
  try {
    const ticket = await loadTicketFull(ticketId);
    if (!ticket) return;

    // Load PIC details
    const pic = await prisma.user.findUnique({
      where: { id: picId },
      select: { id: true, name: true, email: true },
    });
    if (!pic?.email) return;

    const pm = ticket.contract?.projectManager;
    const subject = `[ASSIST] Anda Ditugaskan ke Tiket ${ticket.trackingId}`;
    const html = wrapHtml(`
      <h2 style="color:#333;margin-top:0;">Penugasan Tiket Baru</h2>
      <p>Halo <strong>${pic.name}</strong>,</p>
      <p>Anda telah ditugaskan ke tiket berikut oleh <strong>${pm?.name || "Project Manager"}</strong>. Silakan segera tinjau dan tindak lanjuti.</p>
      ${ticketTable(ticket)}
      <p style="color:#888;font-size:13px;">Silakan login ke sistem ASSIST untuk mulai menangani tiket ini.</p>
    `);

    await sendEmail(pic.email, subject, html);
  } catch (err) {
    console.error("[notifyPicAssigned] Error:", err);
  }
}

