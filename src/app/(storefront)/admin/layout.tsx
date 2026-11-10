import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageShell } from "@/components/storefront/page-shell";
import { LanguageSwitcher } from "@/i18n/language-switcher";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="border-b border-border bg-surface/70">
        <PageShell className="flex items-center gap-3 py-3">
          <div className="min-w-0 flex-1">
            <AdminNav />
          </div>
          <LanguageSwitcher compact />
        </PageShell>
      </div>
      {children}
    </>
  );
}
