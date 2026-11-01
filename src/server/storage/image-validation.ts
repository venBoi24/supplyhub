import type { ImageExtension } from "./keys";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ValidatedImage {
  extension: ImageExtension;
  contentType: string;
  byteSize: number;
}

export type ImageValidationResult =
  { ok: true; image: ValidatedImage } | { ok: false; error: string };

const CONTENT_TYPE_BY_EXTENSION = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

export function sniffImageType(bytes: Uint8Array): ImageExtension | null {
  if (bytes.byteLength >= 3 && startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "jpg";
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "png";
  }

  if (
    bytes.byteLength >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

export function validateImageUpload(input: {
  bytes: Uint8Array;
  declaredType: string;
  declaredSize?: number;
}): ImageValidationResult {
  const { bytes, declaredType, declaredSize } = input;
  const byteSize = bytes.byteLength;

  if (byteSize === 0) {
    return { ok: false, error: "Choose an image file." };
  }

  if (byteSize > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Images must be 5 MB or smaller." };
  }

  if (typeof declaredSize === "number" && declaredSize !== byteSize) {
    return { ok: false, error: "The upload did not arrive in full. Try again." };
  }

  const extension = sniffImageType(bytes);

  if (!extension) {
    return { ok: false, error: "Upload a JPEG, PNG, or WebP image." };
  }

  const contentType = CONTENT_TYPE_BY_EXTENSION[extension];
  const normalizedDeclaredType = declaredType.trim().toLowerCase();

  if (normalizedDeclaredType && normalizedDeclaredType !== contentType) {
    return { ok: false, error: "The file contents do not match the declared image type." };
  }

  return { ok: true, image: { extension, contentType, byteSize } };
}
