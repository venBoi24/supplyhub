"use client";

import { Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useT } from "@/i18n/client";

export function ShareButton({ className }: { className?: string }) {
  const { toast } = useToast();
  const t = useT();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: t("common.linkCopied"),
        description: t("common.linkCopiedBody"),
      });
    } catch {
      toast({
        title: t("common.copyFailed"),
        description: t("common.copyFailedBody"),
      });
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={copyLink} className={className}>
      <Link2 className="size-4" aria-hidden="true" />
      {t("common.copyLink")}
    </Button>
  );
}
