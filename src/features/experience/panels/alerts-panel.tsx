"use client";

import {
  Bell,
  CheckCheck,
  Heart,
  Inbox,
  Lock,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  TrendingDown,
} from "lucide-react";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

import { useExperience } from "../store";
import type { ExperienceTab, NotificationKind } from "../types";

const ICON: Record<NotificationKind, typeof Bell> = {
  delivery: PackageCheck,
  price: TrendingDown,
  stock: Heart,
  chat: Inbox,
  return: RotateCcw,
  security: Lock,
  escrow: ShieldCheck,
  order: ShoppingBag,
};

const TONE: Record<NotificationKind, string> = {
  delivery: "text-[#0f766e] bg-[#0f766e]/10",
  price: "text-[#0f766e] bg-[#0f766e]/10",
  stock: "text-accent bg-accent/10",
  chat: "text-accent bg-accent/10",
  return: "text-[#b45309] bg-[#b45309]/10",
  security: "text-[#b45309] bg-[#b45309]/10",
  escrow: "text-[#0f766e] bg-[#0f766e]/10",
  order: "text-foreground bg-surface-muted",
};

const when = (at: number) =>
  new Date(at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function AlertsPanel({ onNavigate }: { onNavigate: (tab: ExperienceTab) => void }) {
  const { t } = useI18n();
  const { state, markRead, markAllRead, clearNotifications } = useExperience();
  const notifications = state.notifications;
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-medium">
          <Bell className="size-5 text-[#0f766e]" /> {t("experience.alerts.title")}
          {unread > 0 ? (
            <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[0.625rem] font-bold text-white">
              {unread}
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-border-strong hover:text-foreground disabled:opacity-40"
          >
            <CheckCheck className="size-3.5" /> {t("experience.alerts.markAll")}
          </button>
          <button
            type="button"
            onClick={clearNotifications}
            disabled={notifications.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-border-strong hover:text-foreground disabled:opacity-40"
          >
            <Trash2 className="size-3.5" /> {t("experience.alerts.clear")}
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Delivery milestones, price drops, studio replies and security events land here in real time.
      </p>

      {notifications.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
          <Bell className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {t("experience.alerts.empty")} Place a sandbox order or save a piece to see alerts
            arrive.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {notifications.map((n) => {
            const Icon = ICON[n.kind];
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    markRead(n.id);
                    if (n.tab) onNavigate(n.tab);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:border-border-strong",
                    n.read ? "border-border bg-surface" : "border-[#0f766e]/30 bg-[#0f766e]/5",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full",
                      TONE[n.kind],
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{n.title}</span>
                      {!n.read ? (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-accent"
                          aria-label="Unread"
                        />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>
                    <span className="mt-1 block text-[0.625rem] text-muted-foreground">
                      {when(n.at)}
                      {n.tab ? ` · ${t("experience.alerts.tapToOpen")}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
