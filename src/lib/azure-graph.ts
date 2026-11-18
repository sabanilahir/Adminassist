import { prisma } from "@/lib/prisma";

export interface AzureOAuthConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  isEnabled: boolean;
}

export interface AzureDirectoryUser {
  id: string;
  name: string;
  email: string;
  userPrincipalName: string;
  jobTitle?: string | null;
  department?: string | null;
  isAlreadyAdded?: boolean;
}

/**
 * Mendapatkan konfigurasi Azure AD / Entra ID dari database dengan fallback ke environment variables
 */
export async function getAzureOAuthConfig(): Promise<AzureOAuthConfig | null> {
  try {
    const dbConfig = await prisma.oAuthConfig.findUnique({
      where: { provider: "microsoft-entra-id" },
    });

    const tenantId =
      dbConfig?.tenantId || process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || "";
    const clientId =
      dbConfig?.clientId || process.env.AUTH_MICROSOFT_ENTRA_ID_ID || "";
    const clientSecret =
      dbConfig?.clientSecret || process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET || "";
    const isEnabled = dbConfig?.isEnabled ?? (Boolean(clientId && clientSecret));

    if (!tenantId || !clientId || !clientSecret) {
      return null;
    }

    return {
      tenantId: tenantId.trim(),
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      isEnabled,
    };
  } catch (error) {
    console.error("Gagal membaca konfigurasi Azure OAuth:", error);
    return null;
  }
}

/**
 * Memperoleh Access Token dari Microsoft Entra ID menggunakan alur Client Credentials
 */
export async function getAzureAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const tokenEndpoint = `https://login.microsoftonline.com/${encodeURIComponent(
    tenantId
  )}/oauth2/v2.0/token`;

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", "client_credentials");
  params.append("scope", "https://graph.microsoft.com/.default");

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorDesc =
      data.error_description || data.error || `HTTP ${res.status} ${res.statusText}`;
    throw new Error(`Autentikasi Azure AD gagal: ${errorDesc}`);
  }

  if (!data.access_token) {
    throw new Error("Respon token Microsoft Entra ID tidak valid.");
  }

  return data.access_token as string;
}

/**
 * Uji coba koneksi ke Microsoft 365 dan verifikasi hak akses direktori pengguna (User.Read.All)
 */
export async function testAzureConnection(config: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}) {
  try {
    const { tenantId, clientId, clientSecret } = config;

    if (!tenantId?.trim()) {
      return { success: false, error: "Tenant ID (Directory ID) wajib diisi." };
    }
    if (!clientId?.trim()) {
      return { success: false, error: "Client ID (Application ID) wajib diisi." };
    }
    if (!clientSecret?.trim()) {
      return { success: false, error: "Client Secret wajib diisi." };
    }

    const token = await getAzureAccessToken(
      tenantId.trim(),
      clientId.trim(),
      clientSecret.trim()
    );

    // 1. Cek informasi tenant/organisasi
    let tenantDisplayName = "";
    try {
      const orgRes = await fetch("https://graph.microsoft.com/v1.0/organization", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        tenantDisplayName = orgData.value?.[0]?.displayName || "";
      }
    } catch {
      // Abaikan jika endpoint organization terbatas
    }

    // 2. Cek izin membaca direktori user (User.Read.All)
    const usersRes = await fetch(
      "https://graph.microsoft.com/v1.0/users?$top=1&$select=id,displayName,userPrincipalName",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ConsistencyLevel: "eventual",
        },
      }
    );

    if (usersRes.status === 403) {
      return {
        success: false,
        error:
          "Token berhasil didapat, tetapi App Registration belum memiliki hak akses 'User.Read.All' (Application) atau belum diberikan 'Grant Admin Consent' oleh Admin Office 365.",
      };
    }

    if (!usersRes.ok) {
      const errData = await usersRes.json().catch(() => ({}));
      const msg = errData.error?.message || `HTTP ${usersRes.status}`;
      return {
        success: false,
        error: `Gagal mengakses direktori Microsoft Graph: ${msg}`,
      };
    }

    const tenantInfo = tenantDisplayName ? `Tenant: "${tenantDisplayName}"` : `Tenant ID: ${tenantId.trim()}`;
    return {
      success: true,
      message: `Koneksi berhasil! Terhubung ke Microsoft 365 (${tenantInfo}). Hak akses pembacaan direktori pengguna aktif.`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Gagal menghubungkan ke server Azure.",
    };
  }
}

/**
 * Mencari pengguna di direktori Office 365 via Microsoft Graph API
 */
export async function searchOffice365Users(
  query: string,
  limit = 10
): Promise<AzureDirectoryUser[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const config = await getAzureOAuthConfig();
  if (!config || !config.isEnabled) {
    throw new Error(
      "Integrasi Microsoft 365 belum dikonfigurasi atau sedang dinonaktifkan."
    );
  }

  const token = await getAzureAccessToken(
    config.tenantId,
    config.clientId,
    config.clientSecret
  );

  // Escape single quotes for OData filter
  const escapedQ = trimmed.replace(/'/g, "''");
  const filter = `startswith(displayName,'${escapedQ}') or startswith(userPrincipalName,'${escapedQ}') or startswith(mail,'${escapedQ}')`;
  const url = `https://graph.microsoft.com/v1.0/users?$filter=${encodeURIComponent(
    filter
  )}&$select=id,displayName,mail,userPrincipalName,jobTitle,department&$top=${limit}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      ConsistencyLevel: "eventual",
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message =
      errorData.error?.message || `HTTP ${res.status} ${res.statusText}`;
    throw new Error(`Gagal mencari user di Microsoft Graph: ${message}`);
  }

  const data = await res.json();
  const rawUsers = data.value || [];

  return rawUsers.map((u: any) => {
    const email = u.mail || u.userPrincipalName || "";
    return {
      id: u.id,
      name: u.displayName || email,
      email: email.toLowerCase(),
      userPrincipalName: u.userPrincipalName || email,
      jobTitle: u.jobTitle || null,
      department: u.department || null,
    };
  });
}
