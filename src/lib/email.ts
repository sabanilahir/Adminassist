import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"

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

async function getEmailConfig() {
  return await prisma.emailConfig.findFirst()
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
    return { success: false, error: "Email not configured" }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    })

    const info = await transporter.sendMail({
      from: config.smtpFrom,
      to,
      subject,
      html: htmlBody,
    })

    console.log("Email sent:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error("Error sending email:", error)
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