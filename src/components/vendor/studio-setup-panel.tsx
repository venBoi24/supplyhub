import { Check, MapPin, Package, Send, UserRound } from "lucide-react";
import Link from "next/link";

import type { LucideIcon } from "lucide-react";

import { getServerI18n } from "@/i18n/server";

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

export async function StudioSetupPanel({
  hasProfile,
  hasLocation,
  objectCount,
  submittedCount,
}: StudioSetupPanelProps) {
  const { t } = await getServerI18n();
  const steps: SetupStep[] = [
    {
      key: "profile",
      title: t("studio.setupProfileTitle"),
      description: t("studio.setupProfileBody"),
      done: hasProfile,
      href: "/vendor/profile",
      action: hasProfile ? t("studio.setupReviewProfile") : t("studio.setupCompleteProfile"),
      icon: UserRound,
      tone: "bg-mint/25 text-emerald-700 dark:text-emerald-300",
    },
    {
      key: "location",
      title: t("studio.setupLocationTitle"),
      description: t("studio.setupLocationBody"),
      done: hasLocation,
      href: "/vendor/profile",
      action: hasLocation ? t("studio.setupReviewLocation") : t("studio.setupSetLocation"),
      icon: MapPin,
      tone: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    },
    {
      key: "object",
      title: t("studio.setupObjectTitle"),
      description: t("studio.setupObjectBody"),
      done: objectCount > 0,
      href: "/vendor/products/new",
      action: objectCount > 0 ? t("studio.setupAddAnother") : t("studio.addObject"),
      icon: Package,
      tone: "bg-accent-soft text-accent",
    },
    {
      key: "submit",
      title: t("studio.setupSubmitTitle"),
      description: t("studio.setupSubmitBody"),
      done: submittedCount > 0,
      href: "/vendor",
      action: t("studio.setupViewObjects"),
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
          <p className="eyebrow text-muted-foreground">{t("studio.setupGuide")}</p>
          <h2
            id="studio-setup-heading"
            className="mt-2 font-display text-2xl font-medium tracking-[-0.02em]"
          >
            {t("studio.setupHeading")}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("studio.setupProgress", { done: complete, total: steps.length })}
        </p>
      </div>

      <div className="px-6 pt-5 sm:px-8">
        <div
          role="progressbar"
          aria-label={t("studio.setupProgressAria", { done: complete, total: steps.length })}
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
                      {t("studio.setupDone")}
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
        {t("studio.setupFootnote")}
      </p>
    </section>
  );
}
