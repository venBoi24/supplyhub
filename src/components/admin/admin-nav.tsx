"use client";

import {
  Banknote,
  ClipboardList,
  FolderTree,
  ShieldCheck,
  ShoppingBag,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/admin/vendors", labelKey: "admin.vendors", icon: Store },
  { href: "/admin/orders", labelKey: "admin.orders", icon: ShoppingBag },
  { href: "/admin/users", labelKey: "admin.users", icon: Users },
  { href: "/admin/audit", labelKey: "admin.audit", icon: ClipboardList },
  { href: "/admin/products", labelKey: "admin.catalog", icon: ShieldCheck },
  { href: "/admin/categories", labelKey: "admin.departments", icon: FolderTree },
  { href: "/admin/payments", labelKey: "admin.payments", icon: Wallet },
  { href: "/admin/payouts", labelKey: "admin.payouts", icon: Banknote },
];

export function AdminNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav aria-label={t("admin.nav")} className="scroll-x -mx-1 flex items-center gap-1 px-1 py-1">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              active
                ? "bg-surface-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <link.icon className="size-4" aria-hidden="true" />
            {t(link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
