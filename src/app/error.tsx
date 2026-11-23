"use client";

import Link from "next/link";
import { useEffect } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("Unhandled route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <PageShell className="flex min-h-dvh flex-col justify-center py-20 sm:py-28">
      <div className="max-w-xl border-t-2 border-clay pt-8">
        <p className="eyebrow text-clay">{t("common.somethingWrong")}</p>
        <h1 className="mt-3 font-display text-3xl leading-tight font-medium tracking-[-0.03em] text-balance sm:text-4xl">
          {t("error.pageTitle")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("error.pageBody")}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset}>{t("common.retry")}</Button>
          <Button asChild variant="secondary">
            <Link href="/">{t("error.backToSupplyHub")}</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
