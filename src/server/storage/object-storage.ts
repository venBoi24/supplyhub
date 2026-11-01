import "server-only";

import { getServerEnv } from "@/lib/config/env";

import { isStorageKey } from "./keys";
import { localStorage } from "./local-storage";
import { createS3Storage } from "./s3-storage";
import type { StorageAdapter } from "./types";

let adapter: StorageAdapter | undefined;

export function getStorage(): StorageAdapter {
  if (adapter) {
    return adapter;
  }

  const env = getServerEnv();

  adapter =
    env.STORAGE_DRIVER === "s3"
      ? createS3Storage({
          endpoint: env.S3_ENDPOINT,
          region: env.S3_REGION ?? "",
          bucket: env.S3_BUCKET ?? "",
          accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
          secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
        })
      : localStorage;

  return adapter;
}

export function assertStorageKey(key: string): void {
  if (!isStorageKey(key)) {
    throw new Error("Unsupported storage key.");
  }
}
