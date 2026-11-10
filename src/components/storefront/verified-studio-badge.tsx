"use client";

import { ShieldCheck } from "lucide-react";

import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

/**
 * Every studio surfaced in the public catalog has passed marketplace approval
 * (the catalog query only returns vendors with status APPROVED), so this badge
 * reflects a real, server-enforced verification — not client-supplied data.
 */
export function VerifiedStudioBadge({ className }: { className?: string }) {
  const t = useT();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[#0f766e]/30 bg-[#0f766e]/10 px-2.5 py-1 text-[0.6875rem] font-semibold text-[#0f766e]",
        className,
      )}
    >
      <ShieldCheck className="size-3.5" aria-hidden="true" /> {t("product.verifiedStudio")}
    </span>
  );
}
