import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // Ambil entry berdasarkan key "files" atau "file"
    const entries = [...formData.getAll("files"), ...formData.getAll("file")];

    // Filter file berbasis propertiduck-typing (name & size)
    // Hindari penggunaan `instanceof File` karena berpotensi beda konteks runtime Node.js
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
      console.log("ERROR: No valid files found in payload!");
      return NextResponse.json(
        { error: "Tidak ada file valid yang diunggah." }, 
        { status: 400 }
      );
    }

    // Buat direktori public/uploads jika belum ada
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];

    for (const file of validFiles) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Buat nama file aman dengan timestamp unik
      const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = path.join(uploadDir, safeFilename);

      await writeFile(filePath, buffer);
      uploadedUrls.push(`/uploads/${safeFilename}`);
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