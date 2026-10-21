import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // Debug: Lihat semua key yang masuk ke API
    console.log("--- DEBUG UPLOAD ---");
    console.log("FormData keys:", Array.from(formData.keys()));

    // Coba ambil dari key "files" atau "file"
    let files = formData.getAll("files") as File[];
    
    if (!files || files.length === 0 || !(files[0] instanceof File)) {
      const singleFile = formData.get("file") as File | null;
      if (singleFile && singleFile instanceof File) {
        files = [singleFile];
      }
    }

    // Filter hanya entry yang benar-benar File dan ukurannya > 0
    const validFiles = files.filter(f => f && typeof f === 'object' && f.name && f.size > 0);

    console.log("Found valid files count:", validFiles.length);

    if (validFiles.length === 0) {
      console.log("ERROR: No valid files found in payload!");
      return NextResponse.json(
        { error: "Tidak ada file valid yang diunggah." }, 
        { status: 400 }
      );
    }

    // Buat direktori /public/uploads jika belum ada
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const uploadedUrls: string[] = [];

    for (const file of validFiles) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Buat nama file aman
      const safeFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const filePath = path.join(uploadDir, safeFilename);

      await writeFile(filePath, buffer);
      uploadedUrls.push(`/uploads/${safeFilename}`);
    }

    console.log("Successfully saved files:", uploadedUrls);

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