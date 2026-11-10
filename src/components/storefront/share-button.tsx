"use client";

import { Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { useT } from "@/i18n/client";

interface PermissionsPolicyLike {
  allowsFeature(feature: string): boolean;
}

// Embedded previews and some browsers block the async Clipboard API via Permissions
// Policy; calling writeText there logs a NotAllowedError even when the rejection is
// caught. Detect the block first and fall back to a selection copy so the console
// stays clean and the button still works wherever copying is permitted.
function clipboardWriteAllowed(): boolean {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  if (!window.isSecureContext) return false;
  const doc = document as Document & {
    permissionsPolicy?: PermissionsPolicyLike;
    featurePolicy?: PermissionsPolicyLike;
  };
  const policy = doc.permissionsPolicy ?? doc.featurePolicy;
  return !policy || policy.allowsFeature("clipboard-write");
}

function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

export function ShareButton({ className }: { className?: string }) {
  const { toast } = useToast();
  const t = useT();

  async function copyLink() {
    const url = window.location.href;
    let copied = false;
    if (clipboardWriteAllowed()) {
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        copied = false;
      }
    }
    if (!copied) copied = legacyCopy(url);
    toast(
      copied
        ? { title: t("common.linkCopied"), description: t("common.linkCopiedBody") }
        : { title: t("common.copyFailed"), description: t("common.copyFailedBody") },
    );
  }

  return (
    <Button type="button" variant="secondary" onClick={copyLink} className={className}>
      <Link2 className="size-4" aria-hidden="true" />
      {t("common.copyLink")}
    </Button>
  );
}
