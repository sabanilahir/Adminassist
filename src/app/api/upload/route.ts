import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import path from "path";

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain",
]);

// Allowed extensions
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".zip",
  ".docx",
  ".xlsx",
  ".txt",
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file

export async function POST(request: Request) {
  try {
    // 1. Verifikasi Autentikasi Pengguna
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Silakan login terlebih dahulu untuk mengunggah file." },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    // Ambil entry berdasarkan key "files" atau "file"
    const entries = [...formData.getAll("files"), ...formData.getAll("file")];

    // Filter file berbasis validasi nama & ukuran
    const validFiles = entries.filter((entry): entry is File => {
      return (
        entry !== null &&
        typeof entry === "object" &&
        "name" in entry &&
        "size" in entry &&
        typeof entry.name === "string" &&
        entry.size > 0
      );
    });

    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada file valid yang diunggah." },
        { status: 400 }
      );
    }

    const uploadedUrls: string[] = [];

    for (const file of validFiles) {
      // 2. Validasi Ukuran File
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Ukuran file '${file.name}' melebihi batas maksimal (10 MB).` },
          { status: 413 }
        );
      }

      // 3. Validasi Ekstensi & MIME Type
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return NextResponse.json(
          { error: `Ekstensi file '${ext}' tidak diizinkan demi alasan keamanan.` },
          { status: 400 }
        );
      }

      // Jika browser mengirimkan file.type, pastikan dalam whitelist
      if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Tipe file '${file.type}' tidak didukung.` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // 4. Simpan melalui Storage Engine (Local atau S3)
      const mimeType = file.type || "application/octet-stream";
      const result = await storage.uploadFile(buffer, file.name, mimeType);

      uploadedUrls.push(result.url);
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      url: uploadedUrls[0],
    });
  } catch (error) {
    console.error("Upload Error Exception:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server saat upload." },
      { status: 500 }
    );
  }
}
