import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/storefront/page-shell";
import { Button } from "@/components/ui/button";
import {
  Banknote,
  ClipboardList,
  CreditCard,
  FolderTree,
  Package,
  Settings,
  Store,
} from "lucide-react";
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("admin.more"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminMorePage() {
  const { t } = await getServerI18n();
  await requireAdmin();

  const items = [
    { href: "/admin/applications", labelKey: "admin.vendorApplications", icon: Store },
    { href: "/admin/posts", labelKey: "admin.posts", icon: Package },
    { href: "/admin/categories", labelKey: "admin.departments", icon: FolderTree },
    { href: "/admin/payments", labelKey: "admin.payments", icon: CreditCard },
    { href: "/admin/payouts", labelKey: "admin.payouts", icon: Banknote },
    { href: "/admin/reports", labelKey: "admin.reports", icon: ClipboardList },
    { href: "/admin/audit", labelKey: "admin.audit", icon: ClipboardList },
    { href: "/admin/settings", labelKey: "admin.settings", icon: Settings },
  ];

  return (
    <PageShell className="pt-10 sm:pt-14">
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <h1 className="font-display text-3xl font-medium tracking-[-0.04em]">{t("admin.more")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("admin.dashboardIntro")}</p>
      </section>
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-muted"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="font-medium">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </section>
      <div className="mt-8">
        <Button asChild variant="secondary" size="sm">
          <Link href="/">{t("admin.viewMarketplace")}</Link>
        </Button>
      </div>
    </PageShell>
  );
}

export const instant = false;
