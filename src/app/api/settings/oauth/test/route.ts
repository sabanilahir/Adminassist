import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { testAzureConnection, getAzureOAuthConfig } from "@/lib/azure-graph";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let { tenantId, clientId, clientSecret } = body;

    // Jika parameter tidak dikirim lengkap pada body, gunakan konfigurasi yang tersimpan di DB
    if (!tenantId || !clientId || !clientSecret) {
      const savedConfig = await getAzureOAuthConfig();
      if (!savedConfig) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Konfigurasi belum lengkap. Masukkan Tenant ID, Client ID, dan Client Secret.",
          },
          { status: 400 }
        );
      }
      tenantId = tenantId || savedConfig.tenantId;
      clientId = clientId || savedConfig.clientId;
      clientSecret = clientSecret || savedConfig.clientSecret;
    }

    const result = await testAzureConnection({
      tenantId,
      clientId,
      clientSecret,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error testing Azure OAuth connection:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Terjadi kesalahan saat menguji koneksi",
      },
      { status: 500 }
    );
  }
}
