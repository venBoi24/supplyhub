import { connection } from "next/server";

import { isStorageKey } from "@/server/storage/keys";
import { getStorage } from "@/server/storage/object-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  await connection();

  const { key } = await params;
  const storageKey = key.join("/");

  if (!isStorageKey(storageKey)) {
    return new Response("Not found", { status: 404 });
  }

  const object = await getStorage().get(storageKey);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(object.bytes), {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
