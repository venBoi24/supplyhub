import Link from "next/link";
import { PageShell } from "@/components/storefront/page-shell";
import { getAdminDashboardMetrics } from "@/features/admin/queries";
import { requireAdmin } from "@/server/auth/guards";

export default async function AdminIndexPage() {
  await requireAdmin();
  const metrics = await getAdminDashboardMetrics();
  const cards = [
    { label: "Customer accounts", value: metrics.users, href: "/admin/users" },
    { label: "Approved vendors", value: metrics.vendors, href: "/admin/vendors" },
    { label: "Published products", value: metrics.products, href: "/admin/products" },
    { label: "Orders", value: metrics.orders, href: "/admin/orders" },
    { label: "Paid or fulfilling", value: metrics.paidOrders, href: "/admin/orders?status=PAID" },
    { label: "Applications to review", value: metrics.pendingApplications, href: "/admin/vendors" },
  ];

  return (
    <PageShell className="pt-10 sm:pt-14">
      <p className="eyebrow text-muted-foreground">Administration</p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
        Marketplace overview.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
        Counts reflect current database records. Paid or fulfilling includes orders paid,
        processing, shipped, or delivered.
      </p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-border bg-surface p-6 transition-colors hover:bg-surface-muted"
          >
            <dt className="eyebrow text-muted-foreground">{card.label}</dt>
            <dd className="mt-3 font-display text-4xl font-medium">
              {card.value.toLocaleString()}
            </dd>
          </Link>
        ))}
      </dl>
    </PageShell>
  );
}
