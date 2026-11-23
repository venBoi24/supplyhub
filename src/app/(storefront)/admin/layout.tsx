import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { PageShell } from "@/components/storefront/page-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <div className="border-b border-border bg-surface/70">
          <PageShell className="flex items-center justify-end gap-3 py-3">
            <LanguageSwitcher compact />
          </PageShell>
        </div>
        {children}
      </div>
    </div>
  );
}
