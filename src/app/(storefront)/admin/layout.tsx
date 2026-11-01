import type { ReactNode } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { PageShell } from "@/components/storefront/page-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="border-b border-border bg-surface/70">
        <PageShell className="py-3">
          <AdminNav />
        </PageShell>
      </div>
      {children}
    </>
  );
}
