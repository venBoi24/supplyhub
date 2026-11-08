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

import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit log", icon: ClipboardList },
  { href: "/admin/products", label: "Catalog", icon: ShieldCheck },
  { href: "/admin/categories", label: "Departments", icon: FolderTree },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/payouts", label: "Payouts", icon: Banknote },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Administration" className="scroll-x -mx-1 flex items-center gap-1 px-1 py-1">
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
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
