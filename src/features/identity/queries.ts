import "server-only";

import { getDatabase } from "@/server/db/client";

export async function getAccountProfile(userId: string) {
  return getDatabase().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      vendor: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
}
