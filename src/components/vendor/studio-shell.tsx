import { LogOut, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/storefront/wordmark";
import { Button } from "@/components/ui/button";
import { StudioNav } from "@/components/vendor/studio-nav";
import { VendorStatusBadge } from "@/components/vendors/vendor-status-badge";
import { signOutAction } from "@/features/identity/actions";
import type { VendorStatus } from "@/generated/prisma/enums";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { getServerI18n } from "@/i18n/server";

export interface StudioShellProps {
  studio: {
    name: string;
    slug: string | null;
    monogram: string;
    status: VendorStatus | null;
  };
  children: ReactNode;
}

export async function StudioShell({ studio, children }: StudioShellProps) {
  const approved = studio.status === "APPROVED";
  const { t } = await getServerI18n();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-3 px-4 sm:px-6">
          <Link
            href="/"
            aria-label="SupplyHub home"
            className="inline-flex shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
          >
            <Wordmark compact />
          </Link>

          <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-border sm:block" />

          <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-display text-[0.6875rem] font-semibold text-primary-foreground"
            >
              {studio.monogram}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[0.8125rem] leading-tight font-semibold tracking-[-0.01em]">
                {studio.name}
              </p>
              <p className="text-[0.625rem] leading-tight text-muted-foreground">
                {t("studio.ownerAccount")}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher compact />
            {studio.status ? (
              <VendorStatusBadge
                status={studio.status}
                className="hidden rounded-full font-sans text-[0.6563rem] font-medium tracking-normal normal-case sm:inline-flex"
              />
            ) : null}
            {approved && studio.slug ? (
              <Button asChild variant="secondary" size="sm" className="hidden lg:inline-flex">
                <Link href={`/vendors/${studio.slug}`}>{t("studio.viewStorefront")}</Link>
              </Button>
            ) : null}
            {approved ? (
              <Button asChild size="sm">
                <Link href="/vendor/products/new">
                  <Plus className="size-4" aria-hidden="true" />
                  {t("studio.addObject")}
                </Link>
              </Button>
            ) : null}
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                aria-label={t("account.signOut")}
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("account.signOut")}</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {approved ? <StudioNav /> : null}

      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
