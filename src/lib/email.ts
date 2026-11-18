import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"
import { testGraphConnection, sendEmailViaGraph, GraphEmailConfig } from "@/lib/graph-email"

export { testGraphConnection, sendEmailViaGraph }

interface TicketEmailData {
  ticketId: string
  trackingId: string
  title: string
  description: string
  status: string
  priority: string
  createdBy: string
  createdByEmail: string
  createdAt: Date
  assignedTo?: string
  assignedToEmail?: string
  oldStatus?: string
  updatedBy?: string
  updatedByEmail?: string
  updatedAt?: Date
}

export async function getEmailConfig() {
  // Retrieve the first (and only) email configuration from the database.
  // This helper is used by all email-related utilities.
  return await prisma.emailConfig.findFirst()
}

/**
 * Verify SMTP connection using current or provided configuration.
 * Returns an object indicating success and any error message.
 */
export async function testSmtpConnection(overrideConfig?: {
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPass?: string
  smtpFrom?: string
}) {
  const config = overrideConfig || (await getEmailConfig())
  if (!config) {
    return { success: false, error: 'Email configuration not found' }
  }

  const host = config.smtpHost
  const port = Number(config.smtpPort) || 587
  const user = config.smtpUser
  const pass = config.smtpPass

  if (!host) {
    return { success: false, error: 'SMTP Host wajib diisi' }
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user || pass ? {
        user: user || '',
        pass: pass || '',
      } : undefined,
    })
    await transporter.verify()
    return { success: true, message: `Koneksi SMTP ke ${host}:${port} berhasil terverifikasi.` }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Unified connection tester for either SMTP or Microsoft Graph API (O365)
 */
export async function testEmailConnection(provider?: string, overrideConfig?: any) {
  const dbConfig = await getEmailConfig()
  const targetProvider = provider || overrideConfig?.provider || dbConfig?.provider || 'smtp'

  if (targetProvider === 'graph') {
    return await testGraphConnection({
      tenantId: overrideConfig?.graphTenantId ?? dbConfig?.graphTenantId ?? '',
      clientId: overrideConfig?.graphClientId ?? dbConfig?.graphClientId ?? '',
      clientSecret: overrideConfig?.graphClientSecret ?? dbConfig?.graphClientSecret ?? '',
      senderEmail: overrideConfig?.graphSenderEmail ?? dbConfig?.graphSenderEmail ?? '',
    })
  }

  return await testSmtpConnection(overrideConfig || dbConfig || undefined)
}

/**
 * Send a test email to the specified address via SMTP or Microsoft Graph API.
 * Uses a simple subject/body if none are provided.
 */
export async function sendTestEmail(
  to: string,
  subject?: string,
  body?: string,
  provider?: string,
  overrideConfig?: any
) {
  const defaultSubject = 'Test Email Notifikasi ASSIST Helpdesk'
  const defaultBody = `
    <div style="font-family: Arial, sans-serif; padding: 10px;">
      <h3 style="color: #2563eb; margin-top: 0;">Tes Pengiriman Email Notifikasi</h3>
      <p>Ini adalah email uji coba untuk memverifikasi pengaturan notifikasi sistem ASSIST Helpdesk.</p>
      <p>Jika Anda menerima email ini, koneksi dan konfigurasi pengiriman email telah berfungsi dengan baik.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
      <p style="font-size: 12px; color: #64748b;">Waktu pengiriman: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "medium" }).format(new Date())}</p>
    </div>
  `

  const targetSubject = subject ?? defaultSubject
  const targetBody = body ?? defaultBody

  const dbConfig = await getEmailConfig()
  const targetProvider = provider || overrideConfig?.provider || dbConfig?.provider || 'smtp'

  if (targetProvider === 'graph') {
    const graphCfg: GraphEmailConfig = {
      tenantId: overrideConfig?.graphTenantId ?? dbConfig?.graphTenantId ?? '',
      clientId: overrideConfig?.graphClientId ?? dbConfig?.graphClientId ?? '',
      clientSecret: overrideConfig?.graphClientSecret ?? dbConfig?.graphClientSecret ?? '',
      senderEmail: overrideConfig?.graphSenderEmail ?? dbConfig?.graphSenderEmail ?? '',
    }
    return await sendEmailViaGraph(to, targetSubject, targetBody, graphCfg)
  }

  // SMTP path
  const host = overrideConfig?.smtpHost ?? dbConfig?.smtpHost
  const port = Number(overrideConfig?.smtpPort ?? dbConfig?.smtpPort) || 587
  const user = overrideConfig?.smtpUser ?? dbConfig?.smtpUser
  const pass = overrideConfig?.smtpPass ?? dbConfig?.smtpPass
  const from = overrideConfig?.smtpFrom ?? dbConfig?.smtpFrom

  if (!host) {
    return { success: false, error: 'SMTP Host belum dikonfigurasi' }
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user || pass ? {
        user: user || '',
        pass: pass || '',
      } : undefined,
    })

    const info = await transporter.sendMail({
      from: from || user || 'noreply@adminassist.local',
      to,
      subject: targetSubject,
      html: targetBody,
    })

    return { success: true, messageId: info.messageId }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

async function getTemplate(type: string) {
  return await prisma.notificationTemplate.findUnique({
    where: { type }
  })
}

function replaceTemplateVariables(template: string, data: Record<string, any>): string {
  let result = template
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{${key}}`, "g")
    let displayValue = value
    if (value instanceof Date) {
      displayValue = new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full",
        timeStyle: "short"
      }).format(value)
    }
    result = result.replace(regex, displayValue ?? "-")
  }
  return result
}

export async function sendEmail(to: string, subject: string, htmlBody: string) {
  const config = await getEmailConfig()
  
  if (!config || !config.isEnabled) {
    console.log("Email disabled or not configured")
    return { success: false, error: "Email not configured or disabled" }
  }

  // Check provider: Microsoft Graph API O365 vs SMTP
  if (config.provider === "graph") {
    if (!config.graphTenantId || !config.graphClientId || !config.graphClientSecret || !config.graphSenderEmail) {
      console.error("[sendEmail] Microsoft Graph API configuration is incomplete")
      return { success: false, error: "Microsoft Graph API configuration is incomplete" }
    }

    return await sendEmailViaGraph(to, subject, htmlBody, {
      tenantId: config.graphTenantId,
      clientId: config.graphClientId,
      clientSecret: config.graphClientSecret,
      senderEmail: config.graphSenderEmail,
    })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: config.smtpUser || config.smtpPass ? {
        user: config.smtpUser,
        pass: config.smtpPass,
      } : undefined,
    })

    const info = await transporter.sendMail({
      from: config.smtpFrom || config.smtpUser,
      to,
      subject,
      html: htmlBody,
    })

    console.log("Email sent via SMTP:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending email via SMTP:", error)
    return { success: false, error: String(error) }
  }
}

export async function sendTicketCreatedNotification(data: TicketEmailData) {
  const template = await getTemplate("ticket_created")
  
  if (!template) {
    console.log("Template ticket_created not found")
    return { success: false, error: "Template not found" }
  }

  const subject = replaceTemplateVariables(template.subject, data)
  const body = replaceTemplateVariables(template.body, data)

  // Send to creator
  const creatorResult = await sendEmail(data.createdByEmail, subject, body)

  // Send to assigned PIC if exists
  if (data.assignedToEmail) {
    const picResult = await sendEmail(data.assignedToEmail, subject, body)
    return { creatorResult, picResult }
  }

  return { creatorResult }
}

export async function sendStatusChangedNotification(data: TicketEmailData) {
  const template = await getTemplate("status_changed")
  
  if (!template) {
    console.log("Template status_changed not found")
    return { success: false, error: "Template not found" }
  }

  const subject = replaceTemplateVariables(template.subject, data)
  const body = replaceTemplateVariables(template.body, data)

  // Send to creator
  const creatorResult = await sendEmail(data.createdByEmail, subject, body)

  // Send to assigned PIC if exists
  if (data.assignedToEmail) {
    const picResult = await sendEmail(data.assignedToEmail, subject, body)
    return { creatorResult, picResult }
  }

  return { creatorResult }
}

export function formatEmailHtml(content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">ASSIST - Helpdesk System</h1>
      </div>
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        ${content}
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>This is an automated message from ASSIST Helpdesk System</p>
      </div>
    </div>
  `
}

export function formatTicketInfo(data: TicketEmailData): string {
  return `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-weight: bold; width: 140px;">Tracking ID</td>
        <td style="padding: 10px;">${data.trackingId}</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-weight: bold;">Title</td>
        <td style="padding: 10px;">${data.title}</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-weight: bold;">Status</td>
        <td style="padding: 10px;">
          <span style="background: #4CAF50; color: white; padding: 4px 12px; border-radius: 4px;">${data.status}</span>
        </td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-weight: bold;">Priority</td>
        <td style="padding: 10px;">
          <span style="background: ${data.priority === "HIGH" ? "#f44336" : data.priority === "MEDIUM" ? "#ff9800" : "#2196F3"}; color: white; padding: 4px 12px; border-radius: 4px;">${data.priority}</span>
        </td>
      </tr>
      ${data.oldStatus ? `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-weight: bold;">Old Status</td>
        <td style="padding: 10px;"><span style="text-decoration: line-through; color: #999;">${data.oldStatus}</span></td>
      </tr>
      ` : ""}
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-weight: bold;">Description</td>
        <td style="padding: 10px;">${data.description}</td>
      </tr>
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-weight: bold;">Created By</td>
        <td style="padding: 10px;">${data.createdBy}</td>
      </tr>
      ${data.assignedTo ? `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-weight: bold;">Assigned To</td>
        <td style="padding: 10px;">${data.assignedTo}</td>
      </tr>
      ` : ""}
      ${data.updatedBy ? `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px; font-weight: bold;">Updated By</td>
        <td style="padding: 10px;">${data.updatedBy}</td>
      </tr>
      ` : ""}
      <tr>
        <td style="padding: 10px; font-weight: bold;">Created At</td>
        <td style="padding: 10px;">${new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short" }).format(data.createdAt)}</td>
      </tr>
    </table>
  `
}