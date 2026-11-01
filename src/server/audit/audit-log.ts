import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { AuditAction } from "@/generated/prisma/enums";

export interface AuditEventInput {
  actorId: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function recordAuditEvent(
  client: Prisma.TransactionClient,
  input: AuditEventInput,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
    },
  });
}
