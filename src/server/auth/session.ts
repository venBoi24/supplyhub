import "server-only";

import { connection } from "next/server";
import { cache } from "react";

import type { Actor } from "./actor";
import { auth } from "./config";

export const getSessionActor = cache(async (): Promise<Actor | null> => {
  // Auth.js re-signs the JWT on every session read, which draws from the Web Crypto
  // RNG. Declare the request boundary so that never runs during prerendering.
  await connection();

  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role,
    status: user.status,
    vendor:
      user.vendorId && user.vendorStatus ? { id: user.vendorId, status: user.vendorStatus } : null,
  };
});
