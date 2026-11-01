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
import { formatDate } from "@/lib/utils/format-date";
import { requireAdmin } from "@/server/auth/guards";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";

export const metadata: Metadata = { title: "Users", robots: { index: false, follow: false } };

const roles = ["CUSTOMER", "VENDOR", "ADMIN"] as const satisfies readonly UserRole[];
const statuses = ["ACTIVE", "SUSPENDED"] as const satisfies readonly UserStatus[];

export default function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<PageShell className="pt-12">Loading accounts…</PageShell>}>
      <UsersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function UsersContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/users">["searchParams"];
}) {
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
      <p className="eyebrow text-muted-foreground">Administration · signed in as {admin.name}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-[-0.04em]">Accounts.</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {total.toLocaleString()} matching accounts. Admin accounts are protected from
            suspension.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link
            href={`/api/admin/users/export?${new URLSearchParams({ ...(role ? { role } : {}), ...(status ? { status } : {}), ...(search ? { q: search } : {}) }).toString()}`}
          >
            Export latest 1,000 matches
          </Link>
        </Button>
      </div>
      <form
        action="/admin/users"
        className="mt-7 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[1fr_12rem_12rem_auto] sm:items-end"
      >
        <label className="grid gap-2 text-sm">
          Name or email
          <Input name="q" defaultValue={search} maxLength={80} />
        </label>
        <label className="grid gap-2 text-sm">
          Role
          <Select name="role" defaultValue={role ?? ""}>
            <option value="">All roles</option>
            {roles.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm">
          Account status
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" size="sm">
          Filter
        </Button>
      </form>
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-surface-muted text-xs text-muted-foreground">
            <tr>
              <th className="p-4">Account</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Email verified</th>
              <th className="p-4">Joined</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="p-4">
                  <p className="font-medium">{user.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                </td>
                <td className="p-4">{user.role}</td>
                <td className="p-4">{user.status}</td>
                <td className="p-4">
                  {user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : "Not verified"}
                </td>
                <td className="p-4">{formatDate(user.createdAt)}</td>
                <td className="p-4">
                  {user.role === "ADMIN" ? (
                    <span className="text-xs text-muted-foreground">Protected</span>
                  ) : (
                    <div className="grid gap-3">
                      {user.vendor ? (
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/admin/users/${user.id}/inventory`}>
                            Manage store & inventory
                          </Link>
                        </Button>
                      ) : null}
                      {user.vendor?.appealedAt && !user.vendor.appealReviewedAt ? (
                        <section className="min-w-64 rounded-lg border border-warning/40 bg-warning/5 p-3">
                          <p className="text-xs font-semibold text-warning">
                            Vendor appeal pending
                          </p>
                          <p className="mt-1 text-xs font-medium">{user.vendor.name}</p>
                          <p className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground">
                            {user.vendor.appealReason}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Submitted {formatDate(user.vendor.appealedAt)}
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
          <p className="p-8 text-center text-sm text-muted-foreground">
            No accounts match these filters.
          </p>
        ) : null}
      </div>
      <PagedNav
        pathname="/admin/users"
        params={filterParams}
        page={currentPage}
        pageCount={pages}
      />
    </PageShell>
  );
}
