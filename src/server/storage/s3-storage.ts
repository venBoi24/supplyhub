import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { contentTypeForKey } from "./keys";
import type { StorageAdapter } from "./types";

interface S3StorageOptions {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "$metadata" in error &&
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
  );
}

export function createS3Storage(options: S3StorageOptions): StorageAdapter {
  const client = new S3Client({
    region: options.region,
    endpoint: options.endpoint,
    forcePathStyle: options.forcePathStyle,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
  });

  return {
    async put(key, bytes, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: key,
          Body: bytes,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    },

    async get(key) {
      const contentType = contentTypeForKey(key);

      if (!contentType) {
        return null;
      }

      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: options.bucket, Key: key }),
        );

        if (!response.Body) {
          return null;
        }

        return {
          bytes: await response.Body.transformToByteArray(),
          contentType,
        };
      } catch (error) {
        if (isNotFound(error)) {
          return null;
        }

        throw error;
      }
    },

    async delete(key) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: options.bucket, Key: key }));
      } catch (error) {
        if (!isNotFound(error)) {
          throw error;
        }
      }
    },
  };
}
