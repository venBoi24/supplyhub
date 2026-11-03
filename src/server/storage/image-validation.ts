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
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
} as const;

const DECLARED_TYPE_ALIASES: Record<ImageExtension, readonly string[]> = {
  jpg: ["image/jpeg", "image/jpg", "image/pjpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  avif: ["image/avif"],
  bmp: ["image/bmp", "image/x-ms-bmp", "image/x-bmp"],
};

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

  if (
    bytes.byteLength >= 6 &&
    startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "gif";
  }

  if (
    bytes.byteLength >= 12 &&
    startsWith(bytes.slice(4, 8), [0x66, 0x74, 0x79, 0x70]) &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    (bytes[11] === 0x66 || bytes[11] === 0x73)
  ) {
    return "avif";
  }

  if (startsWith(bytes, [0x42, 0x4d])) {
    return "bmp";
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
    return {
      ok: false,
      error: "Upload a JPEG, PNG, WebP, GIF, AVIF, or BMP image.",
    };
  }

  const contentType = CONTENT_TYPE_BY_EXTENSION[extension];
  const normalizedDeclaredType = declaredType.trim().toLowerCase();

  if (
    normalizedDeclaredType &&
    !DECLARED_TYPE_ALIASES[extension].includes(normalizedDeclaredType)
  ) {
    return { ok: false, error: "The file contents do not match the declared image type." };
  }

  return { ok: true, image: { extension, contentType, byteSize } };
}
