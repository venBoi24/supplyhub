"use client";

import {
  Banknote,
  ClipboardList,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

const allLinks = [
  { href: "/admin", labelKey: "admin.overviewTitle", exact: true, icon: LayoutDashboard },
  { href: "/admin/users", labelKey: "admin.users", icon: Users },
  { href: "/admin/vendors", labelKey: "admin.vendors", icon: Store },
  { href: "/admin/posts", labelKey: "admin.posts", icon: Package },
  { href: "/admin/categories", labelKey: "admin.departments", icon: FolderTree },
  { href: "/admin/orders", labelKey: "admin.orders", icon: ShoppingCart },
  { href: "/admin/payments", labelKey: "admin.payments", icon: CreditCard },
  { href: "/admin/payouts", labelKey: "admin.payouts", icon: Banknote },
  { href: "/admin/audit", labelKey: "admin.audit", icon: ClipboardList },
  { href: "/admin/reports", labelKey: "admin.reports", icon: ClipboardList },
  { href: "/admin/settings", labelKey: "admin.settings", icon: Settings },
] as const;

const desktopLinks = allLinks.filter((link) =>
  [
    "/admin",
    "/admin/users",
    "/admin/vendors",
    "/admin/posts",
    "/admin/orders",
    "/admin/payments",
    "/admin/payouts",
    "/admin/reports",
  ].includes(link.href),
);

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminTopNav() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav aria-label={t("admin.nav")} className="hidden flex-wrap items-center gap-1 lg:flex">
        {desktopLinks.map((link) => {
          const active = isActive(pathname, link.href, "exact" in link ? link.exact : false);

          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                active
                  ? "bg-accent-soft text-accent"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              {t(link.labelKey)}
            </Link>
          );
        })}
      </nav>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label={t("admin.nav")}
      >
        <Menu className="size-4" aria-hidden="true" />
        {t("admin.nav")}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute top-0 left-0 h-full w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-background p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg font-semibold tracking-[-0.03em]">
                {t("admin.nav")}
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                <X className="size-4" aria-hidden="true" />
                {t("common.close")}
              </Button>
            </div>
            <nav aria-label={t("admin.nav")} className="grid gap-1">
              {allLinks.map((link) => {
                const active = isActive(pathname, link.href, "exact" in link ? link.exact : false);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-accent-soft text-accent"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                    )}
                  >
                    {t(link.labelKey)}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}
