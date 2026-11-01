import "server-only";

import { connection } from "next/server";

import { decimalToCents } from "@/features/catalog/money";
import { DEFAULT_CURRENCY } from "@/features/catalog/constants";
import { getDatabase } from "@/server/db/client";

const RESERVED = ["PENDING", "APPROVED", "PROCESSING"] as const;
const PAID = ["PAID", "RECONCILED"] as const;

export async function getVendorEarnings(vendorId: string) {
  await connection();
  const database = getDatabase();
  const [earnings, payouts, held, paidOut] = await Promise.all([
    database.commissionLedger.aggregate({
      where: { vendorId, type: "VENDOR_EARNING", currency: DEFAULT_CURRENCY },
      _sum: { amount: true },
    }),
    database.payout.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        reference: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
        paidAt: true,
        reconciledAt: true,
      },
    }),
    database.payout.aggregate({
      where: { vendorId, status: { in: [...RESERVED] }, currency: DEFAULT_CURRENCY },
      _sum: { amount: true },
    }),
    database.payout.aggregate({
      where: { vendorId, status: { in: [...PAID] }, currency: DEFAULT_CURRENCY },
      _sum: { amount: true },
    }),
  ]);
  const earningsCents = earnings._sum.amount ? decimalToCents(earnings._sum.amount) : 0;
  const reservedCents = held._sum.amount ? decimalToCents(held._sum.amount) : 0;
  const paidCents = paidOut._sum.amount ? decimalToCents(paidOut._sum.amount) : 0;
  return {
    currency: DEFAULT_CURRENCY,
    earningsCents,
    reservedCents,
    paidCents,
    availableCents: earningsCents - reservedCents - paidCents,
    payouts: payouts.map((payout) => ({
      ...payout,
      amountCents: decimalToCents(payout.amount),
    })),
  };
}
