import { Check, MapPin, Package, Send, UserRound } from "lucide-react";
import Link from "next/link";

import type { LucideIcon } from "lucide-react";

export interface StudioSetupPanelProps {
  hasProfile: boolean;
  hasLocation: boolean;
  objectCount: number;
  submittedCount: number;
}

interface SetupStep {
  key: string;
  title: string;
  description: string;
  done: boolean;
  href: string;
  action: string;
  icon: LucideIcon;
  tone: string;
}

export function StudioSetupPanel({
  hasProfile,
  hasLocation,
  objectCount,
  submittedCount,
}: StudioSetupPanelProps) {
  const steps: SetupStep[] = [
    {
      key: "profile",
      title: "Complete your studio profile",
      description:
        "Add your studio story and departments. Buyers see this on your public studio page.",
      done: hasProfile,
      href: "/vendor/profile",
      action: hasProfile ? "Review profile" : "Complete profile",
      icon: UserRound,
      tone: "bg-mint/25 text-emerald-700 dark:text-emerald-300",
    },
    {
      key: "location",
      title: "Confirm your pickup location",
      description:
        "Pin where orders are collected. Distance-based delivery pricing starts from this point.",
      done: hasLocation,
      href: "/vendor/profile",
      action: hasLocation ? "Review location" : "Set location",
      icon: MapPin,
      tone: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    },
    {
      key: "object",
      title: "Add your first object",
      description: "Add a cover photo, price, stock, and a short description. Save it as a draft.",
      done: objectCount > 0,
      href: "/vendor/products/new",
      action: objectCount > 0 ? "Add another object" : "New object",
      icon: Package,
      tone: "bg-accent-soft text-accent",
    },
    {
      key: "submit",
      title: "Submit it for review",
      description: "Send a draft to an administrator so it can appear in the storefront catalog.",
      done: submittedCount > 0,
      href: "/vendor",
      action: "View objects",
      icon: Send,
      tone: "bg-clay-soft text-clay",
    },
  ];

  const complete = steps.filter((step) => step.done).length;

  if (complete === steps.length) {
    return null;
  }

  return (
    <section
      aria-labelledby="studio-setup-heading"
      className="overflow-hidden rounded-xl border border-border bg-surface"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border p-6 sm:px-8">
        <div>
          <p className="eyebrow text-muted-foreground">Setup guide</p>
          <h2
            id="studio-setup-heading"
            className="mt-2 font-display text-2xl font-medium tracking-[-0.02em]"
          >
            Let&rsquo;s get your studio ready to sell.
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {complete} of {steps.length} complete
        </p>
      </div>

      <div className="px-6 pt-5 sm:px-8">
        <div
          role="progressbar"
          aria-label={`${complete} of ${steps.length} setup steps complete`}
          aria-valuemin={0}
          aria-valuemax={steps.length}
          aria-valuenow={complete}
          className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
        >
          <span
            className="block h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${(complete / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ul className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8">
        {steps.map((step) => {
          const Icon = step.icon;

          return (
            <li key={step.key}>
              <article
                className={`flex h-full flex-col rounded-lg border p-4 transition-colors sm:p-5 ${
                  step.done
                    ? "border-border bg-background"
                    : "border-border bg-background hover:border-border-strong"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className={`grid size-9 place-items-center rounded-md ${step.tone}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  {step.done ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[0.6875rem] font-medium text-success">
                      <Check className="size-3" aria-hidden="true" />
                      Done
                    </span>
                  ) : null}
                </div>

                <h3 className="mt-3 font-display text-base font-medium tracking-[-0.01em]">
                  {step.title}
                </h3>
                <p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>

                <div className="mt-4 border-t border-border pt-3">
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-accent underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  >
                    {step.action}
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <p className="border-t border-border px-6 py-4 text-xs leading-5 text-muted-foreground sm:px-8">
        This guide disappears once all four steps are complete. It covers only what SupplyHub
        supports — no custom domain, payment onboarding, or theme picker.
      </p>
    </section>
  );
}
