import { StorageDriver, StorageProviderType } from "./types";
import { LocalStorageDriver } from "./local-driver";
import { S3StorageDriver } from "./s3-driver";

let instance: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (instance) return instance;

  const provider: StorageProviderType =
    (process.env.STORAGE_PROVIDER?.toLowerCase() as StorageProviderType) === "s3"
      ? "s3"
      : "local";

  if (provider === "s3") {
    instance = new S3StorageDriver();
  } else {
    instance = new LocalStorageDriver();
  }

  return instance;
}

export const storage = {
  uploadFile: (buffer: Buffer, filename: string, mimeType: string) =>
    getStorageDriver().uploadFile(buffer, filename, mimeType),
  getFile: (key: string) => getStorageDriver().getFile(key),
  deleteFile: (key: string) => getStorageDriver().deleteFile?.(key),
};

export * from "./types";
