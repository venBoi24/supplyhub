"use client";

import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import { useExperience } from "../store";

export function StudioChatButton({
  vendorSlug,
  vendorName,
  className,
}: {
  vendorSlug: string;
  vendorName: string;
  className?: string;
}) {
  const { openChat } = useExperience();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        openChat(vendorSlug, vendorName);
        router.push("/experience?tab=inbox");
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-[#0f766e]/50 hover:text-[#0f766e] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <MessageSquare className="size-4" aria-hidden="true" /> Message studio
    </button>
  );
}
