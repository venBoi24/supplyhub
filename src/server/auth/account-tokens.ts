import "server-only";

import type { AccountTokenPurpose } from "@/generated/prisma/enums";

import { ACCOUNT_TOKEN_PATTERN } from "@/lib/security/token-format";
import { getDatabase } from "@/server/db/client";

import { accountTokenExpiry, createAccountToken, hashAccountToken } from "./account-token-crypto";

export async function issueAccountToken(
  userId: string,
  purpose: AccountTokenPurpose,
): Promise<string> {
  const { token, tokenHash } = createAccountToken();
  const expiresAt = accountTokenExpiry(purpose);
  const database = getDatabase();

  await database.$transaction(async (transaction) => {
    await transaction.accountToken.deleteMany({
      where: { userId, purpose, usedAt: null },
    });

    await transaction.accountToken.create({
      data: { userId, purpose, tokenHash, expiresAt },
    });
  });

  return token;
}

export async function consumeAccountToken(
  token: string,
  purpose: AccountTokenPurpose,
): Promise<{ userId: string } | null> {
  if (!ACCOUNT_TOKEN_PATTERN.test(token)) {
    return null;
  }

  const database = getDatabase();
  const tokenHash = hashAccountToken(token);
  const now = new Date();

  const record = await database.accountToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, purpose: true, expiresAt: true, usedAt: true },
  });

  if (!record || record.purpose !== purpose || record.usedAt !== null || record.expiresAt <= now) {
    return null;
  }

  const marked = await database.accountToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });

  return marked.count === 1 ? { userId: record.userId } : null;
}
