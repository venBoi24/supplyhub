import type { Metadata } from "next";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { PagedNav } from "@/components/ui/paged-nav";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AuditAction } from "@/generated/prisma/enums";
import { parseEnumParam, searchParamValue } from "@/features/admin/filters";
import { listAdminAuditEvents } from "@/features/admin/queries";
import { pageCount, parsePage } from "@/lib/utils/pagination";
import { formatDate } from "@/lib/utils/format-date";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Audit log", robots: { index: false, follow: false } };
const actions = Object.values(AuditAction);

export default function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  return (
    <Suspense fallback={<PageShell className="pt-12">Loading audit events…</PageShell>}>
      <AuditContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AuditContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/audit">["searchParams"];
}) {
  await requireAdmin();
  const params = await searchParams;
  const action = parseEnumParam(params.action, actions);
  const page = parsePage(searchParamValue(params.page));
  const { total, events, page: currentPage } = await listAdminAuditEvents({ page, action });
  const pages = pageCount(total);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <p className="eyebrow text-muted-foreground">Administration</p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em]">Audit log.</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {total.toLocaleString()} recorded events · newest first.
      </p>
      <form
        action="/admin/audit"
        className="mt-7 grid max-w-xl gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
      >
        <label className="grid gap-2 text-sm">
          Action
          <Select name="action" defaultValue={action ?? ""}>
            <option value="">All actions</option>
            {actions.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" size="sm">
          Filter
        </Button>
      </form>
      <ol className="mt-6 space-y-3">
        {events.map((event) => (
          <li key={event.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs tracking-wide">{event.action}</p>
                <p className="mt-1 text-sm">
                  {event.actor?.name ?? "System"}{" "}
                  <span className="text-muted-foreground">
                    on {event.targetType}
                    {event.targetId ? ` · ${event.targetId}` : ""}
                  </span>
                </p>
              </div>
              <time className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</time>
            </div>
            {event.metadata ? (
              <pre className="mt-3 overflow-x-auto rounded-md bg-surface-muted p-3 text-xs whitespace-pre-wrap">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            ) : null}
          </li>
        ))}
      </ol>
      {events.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No audit events match this filter.
        </p>
      ) : null}
      <PagedNav pathname="/admin/audit" params={{ action }} page={currentPage} pageCount={pages} />
    </PageShell>
  );
}
