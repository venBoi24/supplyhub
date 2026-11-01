"use client";

import { Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

export function ShareButton({ className }: { className?: string }) {
  const { toast } = useToast();

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "The address for this piece is on your clipboard.",
      });
    } catch {
      toast({
        title: "Could not copy the link",
        description: "Copy the address from your browser bar instead.",
      });
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={copyLink} className={className}>
      <Link2 className="size-4" aria-hidden="true" />
      Copy link
    </Button>
  );
}
