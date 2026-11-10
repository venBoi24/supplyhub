"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { studioTabs } from "@/components/vendor/studio-nav";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

// Seller-only mobile bottom bar. Mirrors the storefront bottom-nav pattern but
// with studio destinations (Overview first) so a signed-in seller keeps navigation
// within thumb reach on small screens without any buyer shopping tabs.
export function StudioBottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      aria-label={t("studio.nav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-background/85 md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-between px-1">
        {studioTabs.map((tab) => {
          const active = tab.active(pathname);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              <span
                className={cn(
                  "relative grid h-7 w-11 place-items-center rounded-full transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted-foreground group-hover:bg-surface-muted group-hover:text-foreground",
                )}
              >
                <tab.icon className="size-5" aria-hidden="true" />
              </span>
              <span
                className={cn(
                  "w-full truncate px-0.5 text-center text-[0.625rem] leading-none tracking-[0.01em]",
                  active ? "font-semibold text-accent" : "font-medium text-muted-foreground",
                )}
              >
                {t(tab.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
