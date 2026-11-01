import { NextResponse } from "next/server";
import { z } from "zod";

import { parseSearchTerm } from "@/features/admin/filters";
import { UserRole, UserStatus } from "@/generated/prisma/enums";
import { getDatabase } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/guards";
import { buildCsv } from "@/server/export/csv";

const querySchema = z.object({
  role: z.enum(UserRole).optional(),
  status: z.enum(UserStatus).optional(),
});

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    role: url.searchParams.get("role") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid account filters." }, { status: 400 });
  const search = parseSearchTerm(url.searchParams.get("q") ?? undefined);
  const users = await getDatabase().user.findMany({
    where: {
      ...(parsed.data.role ? { role: parsed.data.role } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: { name: true, email: true, role: true, status: true, createdAt: true },
  });
  const csv = buildCsv(
    ["Name", "Email", "Role", "Status", "Created at"],
    users.map((user) => [
      user.name,
      user.email,
      user.role,
      user.status,
      user.createdAt.toISOString(),
    ]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="supplyhub-users.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
