"use client";

import { House, LayoutGrid, ShoppingCart, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

export interface BottomNavViewProps {
  cartCount: number;
  accountHref: string;
  accountLabel: string;
}

export function BottomNavView({ cartCount, accountHref, accountLabel }: BottomNavViewProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const tabs = [
    {
      href: "/",
      label: t("bottomNav.home"),
      icon: House,
      active: pathname === "/",
      badge: 0,
    },
    {
      href: "/products",
      label: t("bottomNav.shop"),
      icon: LayoutGrid,
      active:
        pathname.startsWith("/products") ||
        pathname.startsWith("/categories") ||
        pathname.startsWith("/search"),
      badge: 0,
    },
    {
      href: "/vendors",
      label: t("bottomNav.studios"),
      icon: Store,
      active: pathname.startsWith("/vendors"),
      badge: 0,
    },
    {
      href: "/cart",
      label: t("bottomNav.cart"),
      icon: ShoppingCart,
      active: pathname === "/cart" || pathname.startsWith("/checkout"),
      badge: cartCount,
    },
    {
      href: accountHref,
      label: accountLabel,
      icon: UserRound,
      active:
        pathname.startsWith("/account") ||
        pathname.startsWith("/orders") ||
        pathname.startsWith("/sign-in"),
      badge: 0,
    },
  ];

  return (
    <nav
      aria-label={t("bottomNav.quick")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-background/85 md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-between px-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.active ? "page" : undefined}
            className="group flex flex-1 flex-col items-center justify-center gap-1 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <span
              className={cn(
                "relative grid h-7 w-12 place-items-center rounded-full transition-colors",
                tab.active
                  ? "bg-accent-soft text-accent"
                  : "text-muted-foreground group-hover:bg-surface-muted group-hover:text-foreground",
              )}
            >
              <tab.icon className="size-5" aria-hidden="true" />
              {tab.badge > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[0.5625rem] leading-none text-accent-foreground"
                >
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "text-[0.625rem] leading-none tracking-[0.01em]",
                tab.active ? "font-semibold text-accent" : "font-medium text-muted-foreground",
              )}
            >
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
