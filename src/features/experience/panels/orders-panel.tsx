"use client";

import { useEffect, useState } from "react";
import { KeyRound, PackageCheck, RefreshCw, ShieldCheck } from "lucide-react";

import { DeliveryMap } from "@/components/delivery/delivery-map";
import type { Delivery } from "@/components/delivery/model";
import { cn } from "@/lib/utils/cn";

import { useExperience } from "../store";
import { formatCents, ORDER_STATUS_LABEL, type SandboxOrder } from "../types";

const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none";

function toDelivery(o: SandboxOrder): Delivery {
  const status =
    o.status === "held" || o.status === "processing"
      ? "assigned"
      : o.status === "shipped" || o.status === "delivered"
        ? "transit"
        : "delivered";
  return {
    id: o.id,
    orderNumber: o.number,
    buyer: o.address.name,
    buyerAddress: `${o.address.line1}, ${o.address.city}`,
    storeName: o.items[0]?.vendorName ?? "Studio",
    items: o.items.map((i) => `${i.name} · ${i.quantity}`),
    total: formatCents(o.totalCents, o.currency),
    pickup: o.pickup,
    dropoff: o.dropoff,
    agentStart: o.agentStart,
    agentId: "ag-1",
    status,
    legStartedAt: o.legStartedAt,
    legDurationMs: o.legDurationMs,
    createdAt: o.createdAt,
    route: null,
  };
}

export function OrdersPanel() {
  const { state, verifyOtp, confirmReceipt, placeOrder } = useExperience();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);

  const orders = state.orders;
  const selected = orders.find((o) => o.id === selectedId) ?? orders[0] ?? null;

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center">
        <PackageCheck className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 font-display text-lg font-medium">No sandbox orders yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Place an order in Shop &amp; checkout to watch protected payment and live courier
          tracking.
        </p>
      </div>
    );
  }

  const deliveries = orders.map(toDelivery);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="h-[300px] sm:h-[420px]">
          <DeliveryMap deliveries={deliveries} focusId={selected?.id ?? null} now={now} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border p-3">
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setSelectedId(o.id)}
              className={cn(
                "rounded-lg border px-3 py-1.5 font-mono text-xs transition",
                selected?.id === o.id
                  ? "border-[#0f766e] bg-[#0f766e]/10 text-[#0f766e]"
                  : "border-border text-muted-foreground",
              )}
            >
              {o.number}
            </button>
          ))}
        </div>
      </section>

      {selected ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-semibold">{selected.number}</p>
              <span className="rounded-full bg-[#0f766e]/10 px-2.5 py-1 text-[0.6875rem] font-semibold text-[#0f766e]">
                {ORDER_STATUS_LABEL[selected.status]}
              </span>
            </div>
            <ol className="mt-4 space-y-2">
              {selected.milestones.map((m) => (
                <li key={m.key} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#0f766e]" />
                  <span>{m.label}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <KeyRound className="size-4 text-[#0f766e]" /> Hand-over code
            </p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-[0.3em] text-[#0f766e]">
              {selected.otp}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The courier must enter this code to mark delivered.{" "}
              {selected.otpVerified ? "Verified." : "Not yet verified."}
            </p>
            {selected.status === "shipped" ? (
              <div className="mt-3 flex gap-2">
                <input
                  className={input}
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value);
                    setOtpError(false);
                  }}
                  placeholder="Courier enters code"
                  aria-label="Courier OTP entry"
                  inputMode="numeric"
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={() => {
                    const ok = verifyOtp(selected.id, otpInput);
                    setOtpError(!ok);
                    if (ok) setOtpInput("");
                  }}
                  className="shrink-0 rounded-lg bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white"
                >
                  Confirm hand-over
                </button>
              </div>
            ) : null}
            {otpError ? (
              <p className="mt-2 text-xs text-[#b45309]">Code doesn&apos;t match. Try again.</p>
            ) : null}
          </div>

          {selected.status === "delivered" ? (
            <button
              type="button"
              onClick={() => confirmReceipt(selected.id)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <ShieldCheck className="size-4" /> Confirm receipt &amp; release payment
            </button>
          ) : null}

          {selected.status === "completed" || selected.status === "refunded" ? (
            <button
              type="button"
              onClick={() =>
                placeOrder({
                  email: selected.email,
                  items: selected.items,
                  address: selected.address,
                  paymentMethod: selected.paymentMethod,
                  paymentPhone: selected.paymentPhone,
                  shippingCents: selected.shippingCents,
                  pickup: selected.pickup,
                  dropoff: selected.dropoff,
                })
              }
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold"
            >
              <RefreshCw className="size-4" /> Reorder these items
            </button>
          ) : null}

          <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
            <p className="font-semibold">
              {selected.items.length} items · {formatCents(selected.totalCents, selected.currency)}
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {selected.items.map((i) => (
                <li key={i.slug}>
                  {i.name} × {i.quantity}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {selected.address.line1}, {selected.address.city}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
