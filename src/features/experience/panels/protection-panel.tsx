"use client";

import { useState, type FormEvent } from "react";
import { ShieldCheck, Undo2 } from "lucide-react";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

import { useExperience } from "../store";
import { formatCents } from "../types";

const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none";
const label = "text-[0.6875rem] font-semibold tracking-[0.1em] uppercase text-muted-foreground";

const RETURN_STATUS_KEYS: Record<string, string> = {
  requested: "experience.protection.returnStatusRequested",
  approved: "experience.protection.returnStatusApproved",
  refunded: "experience.protection.returnStatusRefunded",
};

const RETURN_REASON_KEYS = [
  "experience.protection.reasonNotAsDescribed",
  "experience.protection.reasonDamaged",
  "experience.protection.reasonWrongItem",
  "experience.protection.reasonChangedMind",
  "experience.protection.reasonNeverArrived",
] as const;

export function ProtectionPanel() {
  const { t, locale } = useI18n();
  const { state, requestReturn } = useExperience();
  const [orderId, setOrderId] = useState("");
  const [reasonKey, setReasonKey] = useState<string>(RETURN_REASON_KEYS[0]!);
  const [detail, setDetail] = useState("");

  const eligible = state.orders.filter((o) => o.status === "delivered" || o.status === "completed");
  const withReturns = state.orders.filter((o) => o.returnRequest);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!orderId) return;
    requestReturn(orderId, t(reasonKey), detail);
    setOrderId("");
    setDetail("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <section className="rounded-2xl border border-[#0f766e]/30 bg-[#0f766e]/5 p-6">
        <ShieldCheck className="size-8 text-[#0f766e]" />
        <h2 className="mt-3 font-display text-xl font-medium">
          {t("experience.protection.explainedTitle")}
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-semibold text-[#0f766e]">1.</span>{" "}
            {t("experience.protection.stepOne")}
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-[#0f766e]">2.</span>{" "}
            {t("experience.protection.stepTwo")}
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-[#0f766e]">3.</span>{" "}
            {t("experience.protection.stepThree")}
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-[#0f766e]">4.</span>{" "}
            {t("experience.protection.stepFour")}
          </li>
        </ul>
        <p className="mt-4 rounded-lg border border-border bg-surface p-3 text-xs text-muted-foreground">
          {t("experience.protection.guaranteeNote")}
        </p>
      </section>

      <div className="space-y-6">
        <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium">
            <Undo2 className="size-5 text-[#0f766e]" /> {t("experience.protection.returnTitle")}
          </h2>
          {eligible.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("experience.protection.noOrders")}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className={label} htmlFor="ret-order">
                  {t("studio.order")}
                </label>
                <select
                  id="ret-order"
                  className={cn(input, "mt-1")}
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                >
                  <option value="">{t("experience.protection.chooseOrder")}</option>
                  {eligible.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.number} · {formatCents(o.totalCents)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="ret-reason">
                  {t("experience.protection.reason")}
                </label>
                <select
                  id="ret-reason"
                  className={cn(input, "mt-1")}
                  value={reasonKey}
                  onChange={(e) => setReasonKey(e.target.value)}
                >
                  {RETURN_REASON_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {t(key)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="ret-detail">
                  {t("experience.protection.detail")} ({t("common.optional")})
                </label>
                <textarea
                  id="ret-detail"
                  className={cn(input, "mt-1")}
                  rows={3}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder={`${t("experience.protection.detail")}…`}
                />
              </div>
              <button
                type="submit"
                disabled={!orderId}
                className="w-full rounded-lg bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {t("experience.protection.submitReturn")}
              </button>
            </div>
          )}
        </form>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-display text-lg font-medium">
            {t("experience.protection.statusTitle")}
          </h2>
          {state.orders.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("experience.orders.empty")}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {state.orders.map((o) => (
                <li key={o.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">{o.number}</span>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[0.6875rem] font-semibold text-muted-foreground">
                      {t(`experience.orders.status.${o.status}`)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {o.escrowReleasedAt
                      ? t("experience.protection.releasedToStudio", {
                          time: new Date(o.escrowReleasedAt).toLocaleTimeString(locale),
                        })
                      : o.status === "refunded"
                        ? t("experience.protection.refundedToYou")
                        : t("experience.protection.amountHeld", {
                            amount: formatCents(o.totalCents),
                          })}
                  </p>
                  {o.returnRequest ? (
                    <p className="mt-1 text-xs text-[#0f766e]">
                      {t("experience.protection.returnLabel")} · {o.returnRequest.reason} ·{" "}
                      {t(RETURN_STATUS_KEYS[o.returnRequest.status] ?? "common.status")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {withReturns.length === 0 ? null : (
            <p className="mt-3 text-xs text-muted-foreground">
              {t("experience.protection.returnsOnRecord", { count: withReturns.length })}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
