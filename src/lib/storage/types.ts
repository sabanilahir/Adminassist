export interface StorageDriver {
  uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ url: string; key: string }>;

  getFile(
    key: string
  ): Promise<{ buffer: Buffer; mimeType: string }>;

  deleteFile?(key: string): Promise<boolean>;
}

export type StorageProviderType = "local" | "s3";
