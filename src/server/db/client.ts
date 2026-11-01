import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/config/env";

const globalForPrisma = globalThis as typeof globalThis & {
  __supplyhubPrisma?: PrismaClient;
};

let prismaClient: PrismaClient | undefined;

export function getDatabase(): PrismaClient {
  if (prismaClient) {
    return prismaClient;
  }

  prismaClient =
    globalForPrisma.__supplyhubPrisma ??
    new PrismaClient({
      adapter: new PrismaPg({
        connectionString: getServerEnv().DATABASE_URL,
        // The local `prisma dev` server rejects additional sessions once one is held.
        // Serializing through a single connection keeps development reliable; deployed
        // databases use the driver's pool default.
        max: process.env.NODE_ENV === "production" ? undefined : 1,
      }),
      log: ["error"],
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__supplyhubPrisma = prismaClient;
  }

  return prismaClient;
}
