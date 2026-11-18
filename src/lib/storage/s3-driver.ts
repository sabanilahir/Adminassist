import { StorageDriver } from "./types";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import path from "path";
import { Readable } from "stream";

export class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "assist-uploads";

    const endpoint = process.env.S3_ENDPOINT || undefined;
    const region = process.env.S3_REGION || "us-east-1";
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true" || !!endpoint;

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "minioadmin",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "minioadmin",
      },
    });
  }

  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ url: string; key: string }> {
    const cleanName = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `uploads/${Date.now()}-${cleanName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      })
    );

    // Served via protected internal streaming route
    return {
      url: `/api/files/${key}`,
      key,
    };
  }

  async getFile(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);
    const mimeType = response.ContentType || "application/octet-stream";

    return { buffer, mimeType };
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}
