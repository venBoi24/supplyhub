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
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";
import type { Translator } from "@/i18n/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("admin.audit"),
    robots: { index: false, follow: false },
  };
}

const actions = Object.values(AuditAction);

/** Audit action codes are machine identifiers; the dictionary humanizes each one. */
function auditActionLabel(t: Translator, action: AuditAction): string {
  const key = `admin.actions.${action}`;
  const label = t(key);
  return label === key ? action.replaceAll("_", " ") : label;
}

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const { t } = await getServerI18n();

  return (
    <Suspense fallback={<PageShell className="pt-12">{t("admin.loadingAudit")}</PageShell>}>
      <AuditContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AuditContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/audit">["searchParams"];
}) {
  const { t, formatDate, formatNumber } = await getServerI18n();
  await requireAdmin();
  const params = await searchParams;
  const action = parseEnumParam(params.action, actions);
  const page = parsePage(searchParamValue(params.page));
  const { total, events, page: currentPage } = await listAdminAuditEvents({ page, action });
  const pages = pageCount(total);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <p className="eyebrow text-muted-foreground">{t("admin.nav")}</p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em]">
        {t("admin.auditTitle")}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("admin.auditIntro", { count: formatNumber(total) })}
      </p>
      <form
        action="/admin/audit"
        className="mt-7 grid max-w-xl gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
      >
        <label className="grid gap-2 text-sm">
          {t("admin.auditAction")}
          <Select name="action" defaultValue={action ?? ""}>
            <option value="">{t("admin.allActions")}</option>
            {actions.map((value) => (
              <option key={value} value={value}>
                {auditActionLabel(t, value)}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" size="sm">
          {t("common.filter")}
        </Button>
      </form>
      <ol className="mt-6 space-y-3">
        {events.map((event) => (
          <li key={event.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs tracking-wide">
                  {auditActionLabel(t, event.action)}
                </p>
                <p className="mt-1 text-sm">
                  {event.actor?.name ?? t("admin.systemActor")}{" "}
                  <span className="text-muted-foreground">
                    {t("admin.auditOnTarget", { targetType: event.targetType })}
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
          {t("admin.auditEmpty")}
        </p>
      ) : null}
      <PagedNav
        pathname="/admin/audit"
        params={{ action }}
        page={currentPage}
        pageCount={pages}
        label={t("common.pagination")}
      />
    </PageShell>
  );
}

export const instant = false;
