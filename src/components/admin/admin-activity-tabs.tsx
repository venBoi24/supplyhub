"use client";

import Link from "next/link";
import { useState } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { useI18n, useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

export interface AdminRecentOrder {
  id: string;
  orderNumber: string;
  customer: string;
  status: string;
  total: string;
  placedAt: string;
}

export interface AdminRecentVendor {
  id: string;
  name: string;
  status: string;
  location: string;
  createdAt: string;
}

export interface AdminRecentPost {
  id: string;
  name: string;
  vendor: string;
  status: string;
  price: string;
  updatedAt: string;
}

export interface AdminPendingApplication {
  id: string;
  name: string;
  owner: string;
  submittedAt: string;
}

export function AdminActivityTabs({
  orders,
  vendors,
  posts,
  applications,
}: {
  orders: AdminRecentOrder[];
  vendors: AdminRecentVendor[];
  posts: AdminRecentPost[];
  applications: AdminPendingApplication[];
}) {
  const t = useT();
  const tabs = [
    { id: "orders", label: t("admin.recentOrders"), count: orders.length },
    { id: "vendors", label: t("admin.newVendors"), count: vendors.length },
    { id: "posts", label: t("admin.recentPosts"), count: posts.length },
    { id: "applications", label: t("admin.pendingApplications"), count: applications.length },
  ] as const;
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("orders");

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-medium tracking-[-0.03em]">
          {t("admin.recentActivity")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              aria-pressed={active === tab.id}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active === tab.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-surface-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {active === "orders" ? (
          orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.noRecentOrders")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${order.orderNumber}`}
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="text-sm text-muted-foreground">{order.customer}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-md bg-surface-muted px-2 py-1 text-xs">
                      {order.status}
                    </span>
                    <span className="font-medium tabular-nums">{order.total}</span>
                    <span className="text-muted-foreground">{order.placedAt}</span>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {active === "vendors" ? (
          vendors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.noRecentVendors")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {vendors.map((vendor) => (
                <li
                  key={vendor.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/vendors/${vendor.id}`}
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      {vendor.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{vendor.location}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-md bg-surface-muted px-2 py-1 text-xs">
                      {vendor.status}
                    </span>
                    <span className="text-muted-foreground">{vendor.createdAt}</span>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {active === "posts" ? (
          posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.noRecentPosts")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {posts.map((post) => (
                <li
                  key={post.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/posts/${post.id}`}
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      {post.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{post.vendor}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-md bg-surface-muted px-2 py-1 text-xs">
                      {post.status}
                    </span>
                    <span className="font-medium tabular-nums">{post.price}</span>
                    <span className="text-muted-foreground">{post.updatedAt}</span>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {active === "applications" ? (
          applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.noPendingApplications")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {applications.map((application) => (
                <li
                  key={application.id}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href="/admin/vendors"
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      {application.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{application.owner}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{application.submittedAt}</span>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </section>
  );
}
