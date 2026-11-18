import { StorageDriver } from "./types";
import { writeFile, readFile, mkdir, unlink } from "fs/promises";
import path from "path";

export class LocalStorageDriver implements StorageDriver {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), "storage", "uploads");
  }

  private async ensureDir() {
    await mkdir(this.baseDir, { recursive: true });
  }

  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ url: string; key: string }> {
    await this.ensureDir();

    // Sanitize filename and create unique timestamped key
    const cleanName = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `${Date.now()}-${cleanName}`;
    const filePath = path.join(this.baseDir, key);

    await writeFile(filePath, fileBuffer);

    // Return the authenticated streaming endpoint URL
    return {
      url: `/api/files/${key}`,
      key,
    };
  }

  async getFile(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
    // Sanitize key against path traversal
    const safeKey = path.basename(key);
    const filePath = path.join(this.baseDir, safeKey);
    const buffer = await readFile(filePath);

    // Infer basic MIME type from extension
    const ext = path.extname(safeKey).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".pdf": "application/pdf",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".zip": "application/zip",
      ".txt": "text/plain",
    };

    const mimeType = mimeMap[ext] || "application/octet-stream";
    return { buffer, mimeType };
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const safeKey = path.basename(key);
      const filePath = path.join(this.baseDir, safeKey);
      await unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
