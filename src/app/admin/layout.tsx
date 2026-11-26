import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { Bell, LogOut, Search } from "lucide-react";
import Link from "next/link";

import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { getServerI18n } from "@/i18n/server";
import { signOutAction } from "@/features/identity/actions";
import { getSessionActor } from "@/server/auth/session";
import { canPerformAdminAction } from "@/server/auth/policies";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await getSessionActor();

  if (!actor || !canPerformAdminAction(actor)) {
    redirect("/sign-in?next=%2Fadmin");
  }

  const { t } = await getServerI18n();

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="inline-flex shrink-0 items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[4px] border border-current font-display text-[1.05rem] font-semibold">
              S
            </span>
            <span className="font-display text-[1.2rem] font-semibold tracking-[-0.035em]">
              SupplyHub
            </span>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[0.625rem] font-semibold tracking-[0.14em] text-accent-foreground uppercase">
              Admin
            </span>
          </Link>

          <form action="/admin/products" className="order-3 w-full md:order-none md:flex-1">
            <label htmlFor="admin-search" className="sr-only">
              {t("common.search")}
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="admin-search"
                name="q"
                type="search"
                placeholder={t("common.search")}
                className="h-10 w-full rounded-md border border-border bg-background px-9 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/admin/audit"
              aria-label={t("admin.audit")}
              className="grid size-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              <Bell className="size-5" aria-hidden="true" />
            </Link>
            <LanguageSwitcher compact />
            <div className="hidden items-center gap-3 sm:flex">
              <div className="min-w-0 text-right">
                <p className="truncate text-sm font-medium text-foreground">{actor.name}</p>
                <p className="truncate text-xs text-muted-foreground">{actor.email}</p>
              </div>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary" size="sm">
                <LogOut className="size-4" aria-hidden="true" />
                {t("account.signOut")}
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="lg:flex">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <main className="min-w-0 pb-24 lg:pb-0">{children}</main>
        </div>
      </div>

      <AdminBottomNav />
    </div>
  );
}
