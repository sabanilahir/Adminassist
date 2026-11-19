import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { getAppBranding, DEFAULT_BRANDING } from "@/lib/branding";
import { revalidatePath } from "next/cache";
import path from "path";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

export async function GET() {
  try {
    const branding = await getAppBranding();
    return NextResponse.json(branding);
  } catch (error) {
    console.error("Error fetching branding:", error);
    return NextResponse.json(
      { error: "Gagal memuat konfigurasi branding" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Hanya Administrator yang dapat mengubah branding." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const appName = (formData.get("appName") as string) || "ASSIST";
    const appDescription = formData.get("appDescription") as string;
    const loginLayout = (formData.get("loginLayout") as string) || "horizontal";

    const helpTitle = formData.get("helpTitle") as string | null;
    const helpDescription = formData.get("helpDescription") as string | null;
    const helpContactEmail = formData.get("helpContactEmail") as string | null;
    const helpContactPhone = formData.get("helpContactPhone") as string | null;

    const lightFile = formData.get("logoLight") as File | null;
    const darkFile = formData.get("logoDark") as File | null;

    let newLogoLightUrl: string | undefined = undefined;
    let newLogoDarkUrl: string | undefined = undefined;

    // Helper untuk validasi dan upload file logo
    async function processLogoFile(file: File, variant: "light" | "dark") {
      if (file.size > MAX_LOGO_SIZE) {
        throw new Error(
          `Ukuran file logo (${variant}) melebihi batas maksimal 2 MB.`
        );
      }

      const mimeType = file.type || "image/png";
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        throw new Error(
          `Format file logo (${variant}) tidak didukung. Harap gunakan PNG, JPG, WebP, atau SVG.`
        );
      }

      const ext = path.extname(file.name).toLowerCase() || ".png";
      const filename = `branding-${variant}-${Date.now()}${ext}`;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const result = await storage.uploadFile(buffer, filename, mimeType);
      return result.url;
    }

    if (lightFile && typeof lightFile === "object" && lightFile.size > 0) {
      newLogoLightUrl = await processLogoFile(lightFile, "light");
    }

    if (darkFile && typeof darkFile === "object" && darkFile.size > 0) {
      newLogoDarkUrl = await processLogoFile(darkFile, "dark");
    }

    const existing = await prisma.appSetting.findUnique({
      where: { id: "default" },
    });

    const updated = await prisma.appSetting.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        appName,
        appDescription,
        loginLayout,
        helpTitle: helpTitle || DEFAULT_BRANDING.helpTitle,
        helpDescription: helpDescription || DEFAULT_BRANDING.helpDescription,
        helpContactEmail: helpContactEmail || DEFAULT_BRANDING.helpContactEmail,
        helpContactPhone: helpContactPhone || DEFAULT_BRANDING.helpContactPhone,
        logoLightUrl: newLogoLightUrl || null,
        logoDarkUrl: newLogoDarkUrl || null,
      },
      update: {
        appName,
        appDescription,
        loginLayout,
        ...(helpTitle !== null ? { helpTitle } : {}),
        ...(helpDescription !== null ? { helpDescription } : {}),
        ...(helpContactEmail !== null ? { helpContactEmail } : {}),
        ...(helpContactPhone !== null ? { helpContactPhone } : {}),
        ...(newLogoLightUrl !== undefined ? { logoLightUrl: newLogoLightUrl } : {}),
        ...(newLogoDarkUrl !== undefined ? { logoDarkUrl: newLogoDarkUrl } : {}),
      },
    });

    revalidatePath("/login");
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/branding");

    return NextResponse.json({
      success: true,
      message: "Konfigurasi branding berhasil diperbarui.",
      data: {
        appName: updated.appName,
        logoLightUrl: updated.logoLightUrl || DEFAULT_BRANDING.logoHorizontalLight,
        logoDarkUrl: updated.logoDarkUrl || DEFAULT_BRANDING.logoHorizontalDark,
        loginLayout: updated.loginLayout,
        hasCustomLight: Boolean(updated.logoLightUrl),
        hasCustomDark: Boolean(updated.logoDarkUrl),
        helpTitle: updated.helpTitle || DEFAULT_BRANDING.helpTitle,
        helpDescription: updated.helpDescription || DEFAULT_BRANDING.helpDescription,
        helpContactEmail: updated.helpContactEmail || DEFAULT_BRANDING.helpContactEmail,
        helpContactPhone: updated.helpContactPhone || DEFAULT_BRANDING.helpContactPhone,
      },
    });
  } catch (error: any) {
    console.error("Error updating branding:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan saat menyimpan branding." },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Hanya Administrator yang dapat mereset branding." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const target = url.searchParams.get("target") || "all"; // "light", "dark", or "all"

    const existing = await prisma.appSetting.findUnique({
      where: { id: "default" },
    });

    if (existing) {
      await prisma.appSetting.update({
        where: { id: "default" },
        data: {
          ...(target === "light" || target === "all" ? { logoLightUrl: null } : {}),
          ...(target === "dark" || target === "all" ? { logoDarkUrl: null } : {}),
        },
      });
    }

    revalidatePath("/login");
    revalidatePath("/", "layout");
    revalidatePath("/admin/settings/branding");

    return NextResponse.json({
      success: true,
      message: "Logo berhasil direset ke logo bawaan sistem.",
    });
  } catch (error: any) {
    console.error("Error resetting branding:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mereset logo." },
      { status: 500 }
    );
  }
}
