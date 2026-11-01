import { connection } from "next/server";

import { logger } from "@/lib/logging/logger";
import { getDatabase } from "@/server/db/client";

export async function GET(): Promise<Response> {
  await connection();

  const timestamp = new Date().toISOString();
  const headers = { "Cache-Control": "no-store" };

  try {
    await getDatabase().$queryRaw`SELECT 1`;

    return Response.json(
      {
        status: "ok",
        checks: { database: "ok" },
        timestamp,
      },
      { headers },
    );
  } catch (error) {
    logger.error("health.database.unavailable", { error });

    return Response.json(
      {
        status: "degraded",
        checks: { database: "unavailable" },
        timestamp,
      },
      { status: 503, headers },
    );
  }
}
