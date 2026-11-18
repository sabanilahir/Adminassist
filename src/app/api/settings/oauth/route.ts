import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.oAuthConfig.findUnique({
      where: { provider: "microsoft-entra-id" },
    });

    const tenantId =
      config?.tenantId || process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID || "";
    const clientId =
      config?.clientId || process.env.AUTH_MICROSOFT_ENTRA_ID_ID || "";
    const hasSecret = Boolean(
      config?.clientSecret || process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET
    );
    const isEnabled = config?.isEnabled ?? false;

    return NextResponse.json({
      provider: "microsoft-entra-id",
      isEnabled,
      clientId,
      tenantId,
      hasSecret,
      // Jangan kembalikan plaintext secret demi keamanan, beri flag hasSecret
      clientSecret: hasSecret ? "••••••••••••••••" : "",
    });
  } catch (error) {
    console.error("Error fetching OAuth config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, clientSecret, tenantId, isEnabled } = body;

    const existingConfig = await prisma.oAuthConfig.findUnique({
      where: { provider: "microsoft-entra-id" },
    });

    // Jika secret tidak diisi atau berupa placeholder bullet, pertahankan secret lama bila ada
    let resolvedSecret = clientSecret;
    if (
      !resolvedSecret ||
      resolvedSecret.includes("••••") ||
      resolvedSecret.trim() === ""
    ) {
      resolvedSecret =
        existingConfig?.clientSecret ||
        process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ||
        "";
    }

    const config = await prisma.oAuthConfig.upsert({
      where: { provider: "microsoft-entra-id" },
      update: {
        clientId: clientId?.trim() || null,
        clientSecret: resolvedSecret?.trim() || null,
        tenantId: tenantId?.trim() || null,
        isEnabled: Boolean(isEnabled),
      },
      create: {
        provider: "microsoft-entra-id",
        clientId: clientId?.trim() || null,
        clientSecret: resolvedSecret?.trim() || null,
        tenantId: tenantId?.trim() || null,
        isEnabled: Boolean(isEnabled),
      },
    });

    return NextResponse.json({
      success: true,
      provider: config.provider,
      clientId: config.clientId,
      tenantId: config.tenantId,
      isEnabled: config.isEnabled,
      hasSecret: Boolean(config.clientSecret),
    });
  } catch (error) {
    console.error("Error updating OAuth config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
