const UUID_SEGMENT = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export const STORAGE_KEY_PATTERN = new RegExp(
  `^products/${UUID_SEGMENT}/${UUID_SEGMENT}\\.(jpg|png|webp|gif|avif|bmp)$`,
);

export const CONTENT_TYPE_BY_EXTENSION = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
} as const;

export type ImageExtension = keyof typeof CONTENT_TYPE_BY_EXTENSION;

export function isStorageKey(value: string): boolean {
  return STORAGE_KEY_PATTERN.test(value);
}

export function contentTypeForKey(key: string): string | null {
  const extension = key.slice(key.lastIndexOf(".") + 1).toLowerCase();

  return extension in CONTENT_TYPE_BY_EXTENSION
    ? CONTENT_TYPE_BY_EXTENSION[extension as ImageExtension]
    : null;
}

export function mediaUrlForKey(key: string): string {
  return `/media/${key}`;
}
