import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { contentTypeForKey, isStorageKey } from "./keys";
import type { StorageAdapter } from "./types";

const LOCAL_ROOT = path.join(process.cwd(), ".local", "uploads");

export function resolveLocalObjectPath(key: string): string {
  if (!isStorageKey(key)) {
    throw new Error("Unsupported storage key.");
  }

  const target = path.join(LOCAL_ROOT, ...key.split("/"));
  const relative = path.relative(LOCAL_ROOT, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Unsupported storage key.");
  }

  return target;
}

export const localStorage: StorageAdapter = {
  async put(key, bytes) {
    const target = resolveLocalObjectPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { mode: 0o600 });
  },

  async get(key) {
    const target = resolveLocalObjectPath(key);
    const contentType = contentTypeForKey(key);

    if (!contentType) {
      return null;
    }

    try {
      const bytes = await readFile(target);
      return { bytes, contentType };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  },

  async delete(key) {
    const target = resolveLocalObjectPath(key);
    await rm(target, { force: true });
  },
};
