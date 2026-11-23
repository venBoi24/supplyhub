"use client";

import { LayoutDashboard, Package, Store, Users, FolderTree, ShoppingCart, CreditCard, Banknote, ClipboardList, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/admin", labelKey: "admin.overviewTitle", icon: LayoutDashboard },
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
];

function SidebarLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav aria-label={t("admin.nav")} className="grid gap-1">
      {links.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent-soft text-accent"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{t(link.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <div className="border-b border-border bg-surface/70 lg:hidden">
        <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="font-display text-lg font-semibold tracking-[-0.03em]">{t("admin.nav")}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
            {t("admin.nav")}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto border-r border-border bg-background p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg font-semibold tracking-[-0.03em]">{t("admin.nav")}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {t("common.close")}
              </Button>
            </div>
            <SidebarLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface/40 p-4 lg:block">
        <SidebarLinks />
      </aside>
    </>
  );
}
