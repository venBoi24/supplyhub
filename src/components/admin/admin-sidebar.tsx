"use client";

import {
  Banknote,
  ClipboardList,
  CreditCard,
  FolderTree,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

const links = [
  {
    href: "/admin",
    labelKey: "admin.dashboard",
    icon: LayoutDashboard,
    active: (p: string) => p === "/admin",
  },
  {
    href: "/admin/users",
    labelKey: "admin.users",
    icon: Users,
    active: (p: string) => p.startsWith("/admin/users"),
  },
  {
    href: "/admin/vendors",
    labelKey: "admin.vendors",
    icon: Store,
    active: (p: string) => p.startsWith("/admin/vendors"),
  },
  {
    href: "/admin/applications",
    labelKey: "admin.vendorApplications",
    icon: Store,
    active: (p: string) => p.startsWith("/admin/applications"),
  },
  {
    href: "/admin/posts",
    labelKey: "admin.posts",
    icon: Package,
    active: (p: string) => p.startsWith("/admin/posts"),
  },
  {
    href: "/admin/categories",
    labelKey: "admin.departments",
    icon: FolderTree,
    active: (p: string) => p.startsWith("/admin/categories"),
  },
  {
    href: "/admin/orders",
    labelKey: "admin.orders",
    icon: ShoppingCart,
    active: (p: string) => p.startsWith("/admin/orders"),
  },
  {
    href: "/admin/payments",
    labelKey: "admin.payments",
    icon: CreditCard,
    active: (p: string) => p.startsWith("/admin/payments"),
  },
  {
    href: "/admin/payouts",
    labelKey: "admin.payouts",
    icon: Banknote,
    active: (p: string) => p.startsWith("/admin/payouts"),
  },
  {
    href: "/admin/reports",
    labelKey: "admin.reports",
    icon: ClipboardList,
    active: (p: string) => p.startsWith("/admin/reports"),
  },
  {
    href: "/admin/audit",
    labelKey: "admin.audit",
    icon: ClipboardList,
    active: (p: string) => p.startsWith("/admin/audit"),
  },
  {
    href: "/admin/settings",
    labelKey: "admin.settings",
    icon: Settings,
    active: (p: string) => p.startsWith("/admin/settings"),
  },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface/40 p-4 lg:block">
      <nav aria-label={t("admin.nav")} className="grid gap-1">
        {links.map((link) => {
          const active = link.active(pathname);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
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
      <div className="mt-6 border-t border-border pt-4">
        <Link
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <Store className="size-4 shrink-0" aria-hidden="true" />
          {t("admin.viewMarketplace")}
        </Link>
      </div>
    </aside>
  );
}
