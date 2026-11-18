/**
 * Microsoft Graph API (Office 365) Email Connector
 * 
 * Uses Microsoft Entra ID (Azure AD) Client Credentials flow (Application Permissions)
 * Required Microsoft Graph Application Permission: Mail.Send (with Admin Consent)
 */

export interface GraphEmailConfig {
  tenantId: string
  clientId: string
  clientSecret: string
  senderEmail: string
}

/**
 * Acquire Microsoft Graph OAuth2 token using client credentials
 */
export async function getGraphAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const tokenEndpoint = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`
  const params = new URLSearchParams()
  params.append("client_id", clientId)
  params.append("client_secret", clientSecret)
  params.append("grant_type", "client_credentials")
  params.append("scope", "https://graph.microsoft.com/.default")

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  const data = await res.json()
  if (!res.ok) {
    const errorDesc =
      data.error_description || data.error || `HTTP ${res.status} ${res.statusText}`
    throw new Error(`Gagal autentikasi Microsoft Entra ID: ${errorDesc}`)
  }

  if (!data.access_token) {
    throw new Error("Respon autentikasi tidak mengandung access_token.")
  }

  return data.access_token as string
}

/**
 * Verify Microsoft Graph API connection and sender mailbox availability
 */
export async function testGraphConnection(config: Partial<GraphEmailConfig>) {
  try {
    const { tenantId, clientId, clientSecret, senderEmail } = config

    if (!tenantId?.trim()) {
      return { success: false, error: "Tenant ID (Directory ID) O365 wajib diisi." }
    }
    if (!clientId?.trim()) {
      return { success: false, error: "Client ID (Application ID) O365 wajib diisi." }
    }
    if (!clientSecret?.trim()) {
      return { success: false, error: "Client Secret O365 wajib diisi." }
    }

    const token = await getGraphAccessToken(tenantId.trim(), clientId.trim(), clientSecret.trim())

    // If sender email is provided, check user/mailbox status
    if (senderEmail?.trim()) {
      const email = senderEmail.trim()
      const userRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}?$select=id,displayName,mail,userPrincipalName`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (userRes.ok) {
        const userData = await userRes.json()
        const displayName = userData.displayName || userData.mail || email
        return {
          success: true,
          message: `Koneksi berhasil! Terhubung ke Microsoft 365 sebagai: ${displayName} (${userData.mail || userData.userPrincipalName}).`,
        }
      }

      if (userRes.status === 404) {
        return {
          success: false,
          error: `Token berhasil didapat, tetapi mailbox/pengguna '${email}' tidak ditemukan pada tenant O365.`,
        }
      }

      if (userRes.status === 403) {
        // App might only have Mail.Send without User.Read.All
        return {
          success: true,
          message: `Autentikasi token berhasil. Pastikan izin 'Mail.Send' (Application) telah di-Grant Admin Consent di Azure Portal untuk akun ${email}.`,
        }
      }

      const errData = await userRes.json().catch(() => ({}))
      return {
        success: false,
        error:
          errData?.error?.message ||
          `Verifikasi user Graph API gagal dengan status HTTP ${userRes.status}.`,
      }
    }

    // Verify organization details if no specific sender email provided
    const orgRes = await fetch("https://graph.microsoft.com/v1.0/organization?$select=id,displayName", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (orgRes.ok) {
      const orgData = await orgRes.json()
      const orgName = orgData.value?.[0]?.displayName || "Microsoft 365 Tenant"
      return {
        success: true,
        message: `Koneksi Microsoft Graph API berhasil terhubung ke organisasi: ${orgName}.`,
      }
    }

    return {
      success: true,
      message: "Koneksi berhasil! Token autentikasi Microsoft Entra ID valid.",
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || String(error),
    }
  }
}

/**
 * Send an email via Microsoft Graph API sendMail endpoint
 */
export async function sendEmailViaGraph(
  to: string,
  subject: string,
  htmlBody: string,
  config: GraphEmailConfig
) {
  try {
    const { tenantId, clientId, clientSecret, senderEmail } = config

    if (!tenantId?.trim() || !clientId?.trim() || !clientSecret?.trim()) {
      return {
        success: false,
        error: "Kredensial Microsoft Graph API (Tenant ID, Client ID, Client Secret) belum lengkap.",
      }
    }

    if (!senderEmail?.trim()) {
      return {
        success: false,
        error: "Sender Email (Akun Mailbox pengirim O365) wajib diisi.",
      }
    }

    const token = await getGraphAccessToken(tenantId.trim(), clientId.trim(), clientSecret.trim())

    const messagePayload = {
      message: {
        subject,
        body: {
          contentType: "HTML",
          content: htmlBody,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to.trim(),
            },
          },
        ],
      },
      saveToSentItems: true,
    }

    const sendRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail.trim())}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      }
    )

    // Microsoft Graph sendMail returns 202 Accepted on success
    if (sendRes.status === 202 || sendRes.ok) {
      return { success: true }
    }

    const errData = await sendRes.json().catch(() => ({}))
    console.error("[sendEmailViaGraph] Error response from Microsoft Graph:", {
      status: sendRes.status,
      statusText: sendRes.statusText,
      errData,
    })

    if (sendRes.status === 403 || errData?.error?.code === "ErrorAccessDenied") {
      return {
        success: false,
        error: `Akses ditolak (ErrorAccessDenied). Pastikan di Azure Portal: 1) Izin 'Mail.Send' bertipe 'Application' (bukan Delegated), 2) Sudah klik 'Grant admin consent', 3) Akun pengirim '${senderEmail}' memiliki lisensi Exchange Online / Mailbox aktif.`,
      }
    }

    const errorMsg =
      errData?.error?.message ||
      `Pengiriman via Graph API gagal dengan status HTTP ${sendRes.status} (${sendRes.statusText})`
    return { success: false, error: errorMsg }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || String(error),
    }
  }
}
