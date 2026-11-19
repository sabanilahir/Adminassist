import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const fileKey = pathSegments.join("/");

    if (!fileKey) {
      return NextResponse.json({ error: "File key is required" }, { status: 400 });
    }

    // Izinkan akses publik untuk aset logo/branding sistem
    const isPublicAsset =
      fileKey.startsWith("branding-") ||
      fileKey.startsWith("logo-") ||
      fileKey.includes("branding/") ||
      fileKey.includes("logo/");

    const session = await auth();
    if (!session && !isPublicAsset) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { buffer, mimeType } = await storage.getFile(fileKey);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "File not found or inaccessible" },
      { status: 404 }
    );
  }
}
