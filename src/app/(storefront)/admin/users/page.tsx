import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { UserEditForm } from "@/components/admin/user-edit-form";
import { UserAppealEditForm } from "@/components/admin/user-appeal-edit-form";
import { UserStatusForm } from "@/components/admin/user-status-form";
import { VendorAppealReviewActions } from "@/components/vendors/vendor-appeal-review-actions";
import { PageShell } from "@/components/storefront/page-shell";
import { PagedNav } from "@/components/ui/paged-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { listAdminUsers } from "@/features/admin/queries";
import { parseEnumParam, parseSearchTerm, searchParamValue } from "@/features/admin/filters";
import { pageCount, parsePage } from "@/lib/utils/pagination";
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("admin.users"),
    description: t("admin.accountsTitle"),
    robots: { index: false, follow: false },
  };
}

const roles = ["CUSTOMER", "VENDOR", "ADMIN"] as const satisfies readonly UserRole[];
const statuses = ["ACTIVE", "SUSPENDED"] as const satisfies readonly UserStatus[];
const roleLabelKeys: Record<UserRole, string> = {
  CUSTOMER: "admin.role.customer",
  VENDOR: "admin.role.vendor",
  ADMIN: "admin.role.admin",
};
const statusLabelKeys: Record<UserStatus, string> = {
  ACTIVE: "admin.status.active",
  SUSPENDED: "admin.suspended",
};

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const { t } = await getServerI18n();

  return (
    <Suspense fallback={<PageShell className="pt-12">{t("admin.loadingAccounts")}</PageShell>}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function UsersContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/users">["searchParams"];
}) {
  const { t, formatDate, formatNumber } = await getServerI18n();
  const admin = await requireAdmin();
  const params = await searchParams;
  const role = parseEnumParam(params.role, roles);
  const status = parseEnumParam(params.status, statuses);
  const search = parseSearchTerm(params.q);
  const page = parsePage(searchParamValue(params.page));
  const { total, users, page: currentPage } = await listAdminUsers({ page, role, status, search });
  const pages = pageCount(total);
  const filterParams = { role, status, q: search };

  return (
    <PageShell className="pt-10 sm:pt-14">
      <p className="eyebrow text-muted-foreground">
        {t("admin.nav")} · {t("admin.signedInAs", { name: admin.name })}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-[-0.04em]">
            {t("admin.accountsTitle")}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("admin.usersIntro", { count: formatNumber(total) })}
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link
            href={`/api/admin/users/export?${new URLSearchParams({ ...(role ? { role } : {}), ...(status ? { status } : {}), ...(search ? { q: search } : {}) }).toString()}`}
          >
            {t("admin.exportMatches")}
          </Link>
        </Button>
      </div>
      <form
        action="/admin/users"
        className="mt-7 grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] md:items-end"
      >
        <label className="grid gap-2 text-sm">
          {t("admin.usersSearchLabel")}
          <Input name="q" defaultValue={search} maxLength={80} />
        </label>
        <label className="grid gap-2 text-sm">
          {t("admin.roleLabel")}
          <Select name="role" defaultValue={role ?? ""}>
            <option value="">{t("admin.allRoles")}</option>
            {roles.map((value) => (
              <option key={value} value={value}>
                {t(roleLabelKeys[value])}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm">
          {t("admin.accountStatusLabel")}
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">{t("admin.allStatuses")}</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {t(statusLabelKeys[value])}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" size="sm">
          {t("common.filter")}
        </Button>
      </form>
      <div className="mt-6 rounded-xl border border-border bg-surface">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-surface-muted text-xs text-muted-foreground">
            <tr>
              <th className="p-4">{t("admin.tableAccount")}</th>
              <th className="p-4">{t("admin.roleLabel")}</th>
              <th className="p-4">{t("common.status")}</th>
              <th className="p-4">{t("admin.tableEmailVerified")}</th>
              <th className="p-4">{t("admin.tableJoined")}</th>
              <th className="p-4">{t("admin.tableActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="p-4">
                  <p className="font-medium">{user.name}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">{user.email}</p>
                </td>
                <td className="p-4">{t(roleLabelKeys[user.role])}</td>
                <td className="p-4">{t(statusLabelKeys[user.status])}</td>
                <td className="p-4">
                  {user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : t("admin.notVerified")}
                </td>
                <td className="p-4">{formatDate(user.createdAt)}</td>
                <td className="p-4">
                  {user.role === "ADMIN" ? (
                    <span className="text-xs text-muted-foreground">{t("vendor.protected")}</span>
                  ) : (
                    <div className="grid gap-3">
                      {user.vendor ? (
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/admin/users/${user.id}/inventory`}>
                            {t("admin.manageStoreInventory")}
                          </Link>
                        </Button>
                      ) : null}
                      {user.vendor?.appealedAt && !user.vendor.appealReviewedAt ? (
                        <section className="w-full max-w-sm rounded-lg border border-warning/40 bg-warning/5 p-3">
                          <p className="text-xs font-semibold text-warning">
                            {t("admin.vendorAppealPending")}
                          </p>
                          <p className="mt-1 text-xs font-medium">{user.vendor.name}</p>
                          <p className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">
                            {user.vendor.appealReason}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {t("admin.submittedOn", { date: formatDate(user.vendor.appealedAt) })}
                          </p>
                          <UserAppealEditForm
                            userId={user.id}
                            vendorId={user.vendor.id}
                            name={user.name}
                            vendorName={user.vendor.name}
                            appealReason={user.vendor.appealReason ?? ""}
                          />
                          <VendorAppealReviewActions vendorId={user.vendor.id} />
                        </section>
                      ) : null}
                      <UserStatusForm userId={user.id} status={user.status} />
                      <UserEditForm userId={user.id} name={user.name} email={user.email} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("admin.usersEmpty")}</p>
        ) : null}
      </div>
      <PagedNav
        pathname="/admin/users"
        params={filterParams}
        page={currentPage}
        pageCount={pages}
        label={t("common.pagination")}
      />
    </PageShell>
  );
}

export const instant = false;
