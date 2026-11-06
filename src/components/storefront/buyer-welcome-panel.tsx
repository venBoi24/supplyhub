import { Check, LayoutGrid, MailCheck, Package } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export interface BuyerWelcomePanelProps {
  firstName: string;
  emailVerified: boolean;
}

export function BuyerWelcomePanel({ firstName, emailVerified }: BuyerWelcomePanelProps) {
  return (
    <section
      aria-labelledby="account-welcome-heading"
      className="mt-8 overflow-hidden rounded-xl border border-border bg-surface"
    >
      <div className="flex flex-col items-start justify-between gap-4 border-b border-border bg-[radial-gradient(circle_at_88%_15%,color-mix(in_oklab,var(--accent)_16%,transparent),transparent_38%)] p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="max-w-xl">
          <p className="eyebrow text-muted-foreground">Getting started</p>
          <h2
            id="account-welcome-heading"
            className="mt-2 font-display text-2xl font-medium tracking-[-0.02em] text-balance"
          >
            Your account is ready to shop, {firstName}.
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Orders, delivery choices, and receipts stay in one place. Start with a department or the
            full catalog.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/products">Browse objects</Link>
        </Button>
      </div>

      <ul className="grid gap-3 p-6 sm:grid-cols-3 sm:p-8">
        <li>
          <article className="flex h-full flex-col rounded-lg border border-border bg-background p-4 sm:p-5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-md bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
            >
              <LayoutGrid className="size-4" />
            </span>
            <h3 className="mt-3 font-display text-base font-medium tracking-[-0.01em]">
              Browse departments
            </h3>
            <p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">
              Explore product photos by department, then narrow down by vendor and price.
            </p>
            <div className="mt-4 border-t border-border pt-3">
              <Link
                href="/#departments"
                className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-accent underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                Browse categories
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        </li>

        <li>
          <article className="flex h-full flex-col rounded-lg border border-border bg-background p-4 sm:p-5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-md bg-accent-soft text-accent"
            >
              <Package className="size-4" />
            </span>
            <h3 className="mt-3 font-display text-base font-medium tracking-[-0.01em]">
              Your orders
            </h3>
            <p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">
              Track purchases, delivery choice, and order status in one place.
            </p>
            <div className="mt-4 border-t border-border pt-3">
              <Link
                href="/account/orders"
                className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-accent underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                View orders
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        </li>

        <li>
          <article className="flex h-full flex-col rounded-lg border border-border bg-background p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-md bg-clay-soft text-clay"
              >
                <MailCheck className="size-4" />
              </span>
              {emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[0.6875rem] font-medium text-success">
                  <Check className="size-3" aria-hidden="true" />
                  Done
                </span>
              ) : (
                <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[0.6875rem] font-medium text-warning">
                  Needs attention
                </span>
              )}
            </div>
            <h3 className="mt-3 font-display text-base font-medium tracking-[-0.01em]">
              Verify your email
            </h3>
            <p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">
              {emailVerified
                ? "Recovery and order receipts reach this address."
                : "Recovery and order receipts reach this address. Request a link and open it within 24 hours."}
            </p>
            <div className="mt-4 border-t border-border pt-3">
              <Link
                href="#account-email"
                className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-accent underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                {emailVerified ? "Review email settings" : "Verify your email"}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        </li>
      </ul>
    </section>
  );
}
