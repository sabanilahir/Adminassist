/**
 * Manual QC script: test all 4 email notification events end-to-end
 * Run: npx tsx scripts/test-email-notifications.mts
 */
import nodemailer from "nodemailer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── helpers ────────────────────────────────────────────────────────────────
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
</div>`;
}

async function sendEmail(transporter: nodemailer.Transporter, fromAddr: string, to: string, subject: string, html: string) {
  const info = await transporter.sendMail({ from: fromAddr, to, subject, html });
  console.log(`  ✅ Sent to ${to} — messageId: ${info.messageId}`);
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n========== ASSIST Email Notification QC ==========\n");

  // 1. Load email config
  const cfg = await prisma.emailConfig.findFirst();
  if (!cfg || !cfg.isEnabled) {
    console.error("❌ Email config not found or disabled. Aborting.");
    process.exit(1);
  }

  console.log(`📧 SMTP: ${cfg.smtpHost}:${cfg.smtpPort}  from: ${cfg.smtpFrom}`);

  // 2. Create transporter & verify
  const transporter = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpPort === 465,
    auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
  });

  console.log("\n[0] Testing SMTP connection...");
  await transporter.verify();
  console.log("  ✅ SMTP connection OK\n");

  // 3. Load test data
  const ticket = await prisma.ticket.findFirst({
    where: { contractId: { not: null } },
    orderBy: { createdAt: "desc" },
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

  if (!ticket) { console.error("❌ No ticket with contract found."); process.exit(1); }
  console.log(`🎫 Using ticket: [${ticket.trackingId}] "${ticket.title}"`);

  const pm = ticket.contract?.projectManager;
  const pics = ticket.contract?.pics ?? [];
  if (!pm) { console.error("❌ No PM on contract."); process.exit(1); }

  console.log(`   PM  : ${pm.name} <${pm.email}>`);
  pics.forEach(p => console.log(`   PIC : ${p.name} <${p.email}>`));
  console.log();

  const fmt = (d: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(d);

  // ── EVENT 1: Tiket baru ──────────────────────────────────────────────────
  console.log("[EVENT 1] New Ticket → PM + all PICs");
  const e1Subject = `[ASSIST] Tiket Baru: ${ticket.trackingId} – ${ticket.title}`;
  const recipients = [pm, ...pics.filter(p => p.email !== pm.email)];
  for (const r of recipients) {
    const html = wrapHtml(`
      <h2 style="color:#333;margin-top:0;">Laporan Tiket Baru</h2>
      <p>Halo <strong>${r.name}</strong>,</p>
      <p>Terdapat tiket baru yang masuk dan memerlukan perhatian Anda.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px;font-weight:bold;width:160px;">Tracking ID</td><td style="padding:8px;">${ticket.trackingId}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Judul</td><td style="padding:8px;">${ticket.title}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Deskripsi</td><td style="padding:8px;">${ticket.description}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Status</td><td style="padding:8px;">${ticket.status}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Prioritas</td><td style="padding:8px;">${ticket.priority}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Customer</td><td style="padding:8px;">${ticket.customer?.company || ticket.customer?.name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Kontrak</td><td style="padding:8px;">${ticket.contract?.contractNumber}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Kategori</td><td style="padding:8px;">${ticket.category?.name || "Uncategorized"}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Dibuat</td><td style="padding:8px;">${fmt(ticket.createdAt)}</td></tr>
      </table>
    `);
    await sendEmail(transporter, cfg.smtpFrom, r.email, e1Subject, html);
  }

  // ── EVENT 2: PIC klaim tiket ─────────────────────────────────────────────
  console.log("\n[EVENT 2] PIC Claim → PM");
  const pic0 = pics[0];
  if (pic0) {
    const claimTime = fmt(new Date());
    const e2Subject = `[ASSIST] Tiket ${ticket.trackingId} Diklaim oleh PIC`;
    const html = wrapHtml(`
      <h2 style="color:#333;margin-top:0;">Tiket Diklaim oleh PIC</h2>
      <p>Halo <strong>${pm.name}</strong>,</p>
      <p>Tiket berikut telah diklaim oleh PIC dan sedang dalam pengerjaan.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px;font-weight:bold;width:160px;">Tracking ID</td><td style="padding:8px;">${ticket.trackingId}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Judul</td><td style="padding:8px;">${ticket.title}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">PIC Mengklaim</td><td style="padding:8px;">${pic0.name} (${pic0.email})</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Tanggal Klaim</td><td style="padding:8px;">${claimTime}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Status</td><td style="padding:8px;">IN_PROGRESS</td></tr>
      </table>
    `);
    await sendEmail(transporter, cfg.smtpFrom, pm.email, e2Subject, html);
  }

  // ── EVENT 3: Status berubah ──────────────────────────────────────────────
  console.log("\n[EVENT 3] Status Changed (IN_PROGRESS → RESOLVED) → PM");
  const e3Subject = `[ASSIST] Status Tiket ${ticket.trackingId} Berubah: IN_PROGRESS → RESOLVED`;
  const html3 = wrapHtml(`
    <h2 style="color:#333;margin-top:0;">Perubahan Status Tiket</h2>
    <p>Halo <strong>${pm.name}</strong>,</p>
    <p>Status tiket berikut telah diperbarui.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px;font-weight:bold;width:160px;">Tracking ID</td><td style="padding:8px;">${ticket.trackingId}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Judul</td><td style="padding:8px;">${ticket.title}</td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Status Lama</td><td style="padding:8px;"><s style="color:#999;">IN_PROGRESS</s></td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Status Baru</td><td style="padding:8px;"><span style="background:#4caf50;color:white;padding:3px 10px;border-radius:4px;">RESOLVED</span></td></tr>
      <tr><td style="padding:8px;font-weight:bold;">Tanggal Perubahan</td><td style="padding:8px;">${fmt(new Date())}</td></tr>
    </table>
  `);
  await sendEmail(transporter, cfg.smtpFrom, pm.email, e3Subject, html3);

  // ── EVENT 4: PM assign PIC ───────────────────────────────────────────────
  console.log("\n[EVENT 4] PM Assign PIC → PIC yang di-assign");
  if (pic0) {
    const e4Subject = `[ASSIST] Anda Ditugaskan ke Tiket ${ticket.trackingId}`;
    const html4 = wrapHtml(`
      <h2 style="color:#333;margin-top:0;">Penugasan Tiket Baru</h2>
      <p>Halo <strong>${pic0.name}</strong>,</p>
      <p>Anda telah ditugaskan ke tiket berikut oleh <strong>${pm.name}</strong>. Silakan segera tinjau dan tindak lanjuti.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px;font-weight:bold;width:160px;">Tracking ID</td><td style="padding:8px;">${ticket.trackingId}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Judul</td><td style="padding:8px;">${ticket.title}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Deskripsi</td><td style="padding:8px;">${ticket.description}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Status</td><td style="padding:8px;">${ticket.status}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Prioritas</td><td style="padding:8px;">${ticket.priority}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Customer</td><td style="padding:8px;">${ticket.customer?.company || ticket.customer?.name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Kontrak</td><td style="padding:8px;">${ticket.contract?.contractNumber}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;">Ditugaskan oleh</td><td style="padding:8px;">${pm.name}</td></tr>
      </table>
    `);
    await sendEmail(transporter, cfg.smtpFrom, pic0.email, e4Subject, html4);
  }

  console.log("\n========== QC SELESAI – Semua event berhasil dikirim ==========\n");
}

main().catch(err => {
  console.error("\n❌ ERROR:", err);
  process.exit(1);
}).finally(() => prisma.$disconnect());

