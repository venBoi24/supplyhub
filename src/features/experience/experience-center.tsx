"use client";

import { useState } from "react";
import {
  Bell,
  Heart,
  Inbox,
  MessageSquare,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Lock,
} from "lucide-react";

import type { ProductListing } from "@/features/catalog/types";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

import { ExperienceProvider, useExperience } from "./store";
import type { ExperienceTab } from "./types";
import { AlertsPanel } from "./panels/alerts-panel";
import { InboxPanel } from "./panels/inbox-panel";
import { OrdersPanel } from "./panels/orders-panel";
import { ProtectionPanel } from "./panels/protection-panel";
import { ReviewsPanel } from "./panels/reviews-panel";
import { SavedPanel } from "./panels/saved-panel";
import { SecurityPanel } from "./panels/security-panel";
import { ShopPanel } from "./panels/shop-panel";

const TABS: { id: ExperienceTab; labelKey: string; icon: typeof ShieldCheck }[] = [
  { id: "shop", labelKey: "experience.tabs.shop", icon: ShoppingBag },
  { id: "orders", labelKey: "experience.tabs.orders", icon: PackageCheck },
  { id: "protection", labelKey: "experience.tabs.protection", icon: ShieldCheck },
  { id: "reviews", labelKey: "experience.tabs.reviews", icon: Star },
  { id: "inbox", labelKey: "experience.tabs.inbox", icon: Inbox },
  { id: "security", labelKey: "experience.tabs.security", icon: Lock },
  { id: "saved", labelKey: "experience.tabs.saved", icon: Heart },
  { id: "alerts", labelKey: "experience.tabs.alerts", icon: Bell },
];

function CenterInner({
  products,
  initialTab,
}: {
  products: ProductListing[];
  initialTab: ExperienceTab;
}) {
  const [tab, setTab] = useState<ExperienceTab>(initialTab);
  const { t } = useI18n();
  const { state, resetExperience } = useExperience();
  const unread = state.notifications.filter((n) => !n.read).length;
  const chatUnread = Object.values(state.chats).reduce((sum, t) => sum + t.unread, 0);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="eyebrow text-muted-foreground">{t("experience.eyebrow")}</p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
            {t("experience.title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {t("experience.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0f766e]/30 bg-[#0f766e]/10 px-3 py-1.5 text-[0.6875rem] font-semibold text-[#0f766e]">
            <ShieldCheck className="size-3.5" /> {t("experience.sandbox")}
          </span>
          <button
            type="button"
            onClick={resetExperience}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-border-strong hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> {t("experience.reset")}
          </button>
        </div>
      </header>

      <nav
        aria-label={t("experience.sections")}
        className="mt-6 flex scrollbar-thin gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition",
              tab === item.id
                ? "bg-[#0f766e] text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon className="size-4" /> {t(item.labelKey)}
            {item.id === "alerts" && unread > 0 ? (
              <span className="ml-0.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-bold text-white">
                {unread}
              </span>
            ) : null}
            {item.id === "inbox" && chatUnread > 0 ? (
              <span className="ml-0.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-bold text-white">
                {chatUnread}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === "shop" ? <ShopPanel products={products} /> : null}
        {tab === "orders" ? <OrdersPanel /> : null}
        {tab === "protection" ? <ProtectionPanel /> : null}
        {tab === "reviews" ? <ReviewsPanel products={products} /> : null}
        {tab === "inbox" ? <InboxPanel /> : null}
        {tab === "security" ? <SecurityPanel /> : null}
        {tab === "saved" ? <SavedPanel products={products} /> : null}
        {tab === "alerts" ? <AlertsPanel onNavigate={setTab} /> : null}
      </div>

      <p className="mt-10 flex items-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
        <MessageSquare className="size-4" aria-hidden="true" />
        {t("experience.footnote")}
      </p>
    </div>
  );
}

export function ExperienceCenter({
  products,
  initialTab = "shop",
}: {
  products: ProductListing[];
  initialTab?: ExperienceTab;
}) {
  return (
    <ExperienceProvider>
      <CenterInner products={products} initialTab={initialTab} />
    </ExperienceProvider>
  );
}
