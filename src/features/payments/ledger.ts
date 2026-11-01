export interface VendorSubtotal {
  vendorOrderId: string;
  vendorId: string;
  subtotalCents: number;
}

export interface CommissionAllocation extends VendorSubtotal {
  commissionCents: number;
  earningCents: number;
}

function roundHalfUp(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

export function allocateCommission(
  shares: readonly VendorSubtotal[],
  basisPoints: number,
): CommissionAllocation[] {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new Error("Commission basis points must be an integer between 0 and 10000.");
  }

  return shares.map((share) => {
    if (!Number.isSafeInteger(share.subtotalCents) || share.subtotalCents < 0) {
      throw new Error("Vendor subtotals must be non-negative integer minor units.");
    }

    const commissionCents = roundHalfUp(share.subtotalCents * basisPoints, 10_000);

    return {
      ...share,
      commissionCents,
      earningCents: share.subtotalCents - commissionCents,
    };
  });
}

/**
 * Allocates a refund across vendor orders in proportion to their subtotals, using largest
 * remainders so the allocation always sums exactly to the requested refund.
 */
export function allocateRefund(
  shares: readonly VendorSubtotal[],
  refundCents: number,
): Map<string, number> {
  if (!Number.isSafeInteger(refundCents) || refundCents < 0) {
    throw new Error("Refund amounts must be non-negative integer minor units.");
  }

  const total = shares.reduce((sum, share) => sum + share.subtotalCents, 0);

  if (refundCents > total) {
    throw new Error("A refund cannot exceed the vendor subtotals.");
  }

  const allocations = new Map(shares.map((share) => [share.vendorOrderId, 0]));

  if (refundCents === 0 || total === 0) {
    return allocations;
  }

  const raw = shares.map((share) => refundCents * share.subtotalCents);
  let allocated = 0;

  for (const [index, share] of shares.entries()) {
    const amount = Math.floor(raw[index]! / total);
    allocations.set(share.vendorOrderId, amount);
    allocated += amount;
  }

  const remainders = shares
    .map((share, index) => ({
      vendorOrderId: share.vendorOrderId,
      remainder: raw[index]! % total,
      index,
    }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (let index = 0; index < refundCents - allocated; index += 1) {
    const target = remainders[index % remainders.length]!;
    allocations.set(target.vendorOrderId, (allocations.get(target.vendorOrderId) ?? 0) + 1);
  }

  return allocations;
}

export interface ReversedCommission {
  earningReversalCents: number;
  commissionReversalCents: number;
}

export function reverseCommission(
  allocation: CommissionAllocation,
  refundCents: number,
): ReversedCommission {
  if (refundCents < 0 || refundCents > allocation.subtotalCents) {
    throw new Error("Refund reversal must stay within the original vendor subtotal.");
  }

  if (allocation.subtotalCents === 0) {
    return { earningReversalCents: 0, commissionReversalCents: 0 };
  }

  const earningReversalCents = roundHalfUp(
    allocation.earningCents * refundCents,
    allocation.subtotalCents,
  );

  return {
    earningReversalCents,
    commissionReversalCents: refundCents - earningReversalCents,
  };
}
