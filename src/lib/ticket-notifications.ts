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
      customer: { select: { id: true, customerCode: true, name: true, company: true } },
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
// 3. Ticket status changed → notify PM
// ---------------------------------------------------------------------------
export async function notifyStatusChanged(ticketId: string, oldStatus: string, newStatus: string) {
  try {
    const ticket = await loadTicketFull(ticketId);
    if (!ticket) return;

    const pm = ticket.contract?.projectManager;
    if (!pm?.email) return;

    const now = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(new Date());
    const subject = `[ASSIST] Status Tiket ${ticket.trackingId} Berubah: ${oldStatus} → ${newStatus}`;
    const html = wrapHtml(`
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
    `);

    await sendEmail(pm.email, subject, html);
  } catch (err) {
    console.error("[notifyStatusChanged] Error:", err);
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

