"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Phone,
  Plus,
  Star,
  Store,
  Trash2,
  UserRound,
} from "lucide-react";

import { useT } from "@/i18n/client";
import type { Translator } from "@/i18n/dictionary";
import { cn } from "@/lib/utils/cn";

import {
  legProgress,
  STATUS_LABEL_KEYS,
  STATUS_ORDER,
  type Delivery,
  type DeliveryStatus,
} from "./model";
import { useDelivery } from "./store";

const panel = "rounded-2xl border border-[#223047] bg-[#0d1222]";
const muted = "text-[#a7b1c7]";
const input =
  "w-full rounded-lg border border-[#2a3a5f] bg-[#0a0f1d] px-3 py-2 text-sm text-[#edf1fb] placeholder:text-[#5b6a8a] focus:border-[#f97316] focus:outline-none";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#f97316] px-4 py-2.5 text-sm font-semibold text-[#0a0f1d] transition hover:bg-[#fb923c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]";
const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#2a3a5f] px-3 py-2 text-sm text-[#a7b1c7] transition hover:border-[#f97316] hover:text-[#edf1fb]";

const statusTone: Record<DeliveryStatus, string> = {
  pending: "bg-[#2a2117] text-[#fbbf24]",
  assigned: "bg-[#16233a] text-[#60a5fa]",
  accepted: "bg-[#16233a] text-[#60a5fa]",
  to_pickup: "bg-[#16233a] text-[#60a5fa]",
  at_pickup: "bg-[#12271f] text-[#2dd4bf]",
  transit: "bg-[#2a1a0d] text-[#fb923c]",
  delivered: "bg-[#12271f] text-[#4ade80]",
};

const LIVE_NOTE_KEYS: Record<DeliveryStatus, string> = {
  pending: "delivery.notePending",
  assigned: "delivery.noteAssigned",
  accepted: "delivery.noteAccepted",
  to_pickup: "delivery.noteToPickup",
  at_pickup: "delivery.noteAtPickup",
  transit: "delivery.noteTransit",
  delivered: "delivery.noteDelivered",
};

function StatusPill({ status }: { status: DeliveryStatus }) {
  const t = useT();
  return (
    <span
      className={cn("rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold", statusTone[status])}
    >
      {t(STATUS_LABEL_KEYS[status])}
    </span>
  );
}

function etaText(d: Delivery, now: number, t: Translator): string {
  if (d.status === "delivered") return t("checkout.status.delivered");
  if (d.status !== "transit" && d.status !== "to_pickup") return t("delivery.waitingForCourier");
  const remaining = Math.max(0, d.legDurationMs - (now - d.legStartedAt));
  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  return mins > 0
    ? t("delivery.durationMinutes", { mins, secs })
    : t("delivery.durationSeconds", { secs });
}

interface ViewProps {
  onFocus: (id: string | null) => void;
}

export function VendorView({ onFocus }: ViewProps) {
  const t = useT();
  const { state, now, addAgent, toggleAgent, removeAgent, assignDelivery } = useDelivery();
  const [name, setName] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [plate, setPlate] = useState("");
  const [phone, setPhone] = useState("");
  const [assignChoice, setAssignChoice] = useState<Record<string, string>>({});

  useEffect(() => onFocus(null), [onFocus]);

  const online = state.agents.filter((a) => a.status === "online").length;
  const active = state.deliveries.filter(
    (d) => d.status !== "delivered" && d.status !== "pending",
  ).length;
  const delivered = state.deliveries.filter((d) => d.status === "delivered").length;
  const pending = state.deliveries.filter((d) => d.status === "pending");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !vehicle.trim()) return;
    addAgent({
      name: name.trim(),
      vehicle: vehicle.trim(),
      plate: plate.trim() || "—",
      phone: phone.trim() || "—",
    });
    setName("");
    setVehicle("");
    setPlate("");
    setPhone("");
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("delivery.couriersOnline"), value: online },
          { label: t("delivery.activeDeliveries"), value: active },
          { label: t("checkout.status.delivered"), value: delivered },
        ].map((s) => (
          <div key={s.label} className={cn(panel, "p-4")}>
            <p className={cn("text-[0.6875rem] tracking-[0.12em] uppercase", muted)}>{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[#edf1fb]">{s.value}</p>
          </div>
        ))}
      </div>

      <section className={cn(panel, "p-5")}>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-[#edf1fb]">
          <Bike className="size-5 text-[#f97316]" /> {t("delivery.yourDeliveryTeam")}
        </h2>
        <ul className="mt-4 space-y-3">
          {state.agents.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[#223047] bg-[#0a0f1d] p-3"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#16233a] font-display text-sm font-semibold text-[#60a5fa]">
                {a.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#edf1fb]">{a.name}</p>
                <p className={cn("truncate text-xs", muted)}>
                  {a.vehicle} · {a.plate}
                </p>
              </div>
              <span className={cn("flex items-center gap-1 text-xs", muted)}>
                <Star className="size-3.5 text-[#fbbf24]" /> {a.rating} ·{" "}
                {t("common.countNoun", {
                  count: a.trips,
                  noun: t(a.trips === 1 ? "common.tripOne" : "common.tripMany"),
                })}
              </span>
              <button
                type="button"
                onClick={() => toggleAgent(a.id)}
                className={btnGhost}
                aria-pressed={a.status === "online"}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    a.status === "online" ? "bg-[#4ade80]" : "bg-[#5b6a8a]",
                  )}
                />
                {a.status === "online" ? t("delivery.online") : t("delivery.offline")}
              </button>
              <button
                type="button"
                onClick={() => removeAgent(a.id)}
                className={btnGhost}
                aria-label={t("delivery.removeCourier", { name: a.name })}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            className={input}
            placeholder={t("delivery.courierName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={t("delivery.courierName")}
          />
          <input
            className={input}
            placeholder={t("delivery.vehiclePlaceholder")}
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            aria-label={t("delivery.vehicle")}
          />
          <input
            className={input}
            placeholder={t("delivery.plateNumber")}
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            aria-label={t("delivery.plateNumber")}
          />
          <input
            className={input}
            placeholder={t("checkout.phoneLabel")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label={t("checkout.phoneLabel")}
          />
          <button type="submit" className={cn(btnPrimary, "sm:col-span-2")}>
            <Plus className="size-4" /> {t("delivery.addCourier")}
          </button>
        </form>
      </section>

      <section className={cn(panel, "p-5")}>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-[#edf1fb]">
          <Package className="size-5 text-[#f97316]" /> {t("delivery.dispatchBoard")}
        </h2>
        {pending.length === 0 ? (
          <p className={cn("mt-3 text-sm", muted)}>{t("delivery.allDispatched")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((d) => (
              <li key={d.id} className="rounded-xl border border-[#223047] bg-[#0a0f1d] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm text-[#edf1fb]">{d.orderNumber}</p>
                  <StatusPill status={d.status} />
                </div>
                <p className={cn("mt-1 text-xs", muted)}>
                  {d.storeName} → {d.buyerAddress}
                </p>
                <div className="mt-3 flex gap-2">
                  <select
                    className={input}
                    value={assignChoice[d.id] ?? ""}
                    onChange={(e) => setAssignChoice((p) => ({ ...p, [d.id]: e.target.value }))}
                    aria-label={t("delivery.assignCourierFor", { order: d.orderNumber })}
                  >
                    <option value="">{t("delivery.chooseCourier")}</option>
                    {state.agents
                      .filter((a) => a.status === "online")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={!assignChoice[d.id]}
                    onClick={() => {
                      const choice = assignChoice[d.id];
                      if (choice) assignDelivery(d.id, choice);
                    }}
                  >
                    {t("delivery.assign")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-4 space-y-2">
          {state.deliveries
            .filter((d) => d.status !== "pending")
            .map((d) => {
              const agent = state.agents.find((a) => a.id === d.agentId);
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#223047] px-3 py-2"
                >
                  <span className="font-mono text-xs text-[#edf1fb]">{d.orderNumber}</span>
                  <span className={cn("text-xs", muted)}>
                    {agent?.name ?? t("delivery.unassigned")}
                  </span>
                  <StatusPill status={d.status} />
                  <span className={cn("text-xs", muted)}>{etaText(d, now, t)}</span>
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}

export function AgentView({ onFocus }: ViewProps) {
  const t = useT();
  const { state, now, acceptDelivery, startPickup, confirmPickup, completeDelivery } =
    useDelivery();
  const [agentId, setAgentId] = useState("ag-1");
  const agent = state.agents.find((a) => a.id === agentId) ?? state.agents[0];
  const job =
    state.deliveries.find((d) => d.agentId === agent?.id && d.status !== "delivered") ?? null;

  useEffect(() => onFocus(job?.id ?? null), [job?.id, onFocus]);

  if (!agent) return <p className={muted}>{t("delivery.noCourierProfile")}</p>;

  const progress = job ? legProgress(job, now) : 0;

  return (
    <div className="space-y-5">
      <div className={cn(panel, "flex flex-wrap items-center gap-3 p-4")}>
        <span className="grid size-12 place-items-center rounded-full bg-[#16233a] font-display text-base font-semibold text-[#60a5fa]">
          {agent.name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold text-[#edf1fb]">{agent.name}</p>
          <p className={cn("text-xs", muted)}>
            {agent.vehicle} · {agent.plate}
          </p>
        </div>
        <select
          className={cn(input, "w-auto")}
          value={agent.id}
          onChange={(e) => setAgentId(e.target.value)}
          aria-label={t("delivery.switchCourier")}
        >
          {state.agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("delivery.rating"), value: agent.rating.toFixed(1) },
          { label: t("common.trips"), value: agent.trips },
          { label: t("delivery.earningsToday"), value: "TZS 38,000" },
        ].map((s) => (
          <div key={s.label} className={cn(panel, "p-4")}>
            <p className={cn("text-[0.6875rem] tracking-[0.12em] uppercase", muted)}>{s.label}</p>
            <p className="mt-1 font-display text-xl font-semibold text-[#edf1fb]">{s.value}</p>
          </div>
        ))}
      </div>

      {job ? (
        <section className={cn(panel, "overflow-hidden")}>
          <div className="border-b border-[#223047] p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm text-[#edf1fb]">{job.orderNumber}</p>
              <StatusPill status={job.status} />
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <Store className="mt-0.5 size-4 shrink-0 text-[#2dd4bf]" />
                <div>
                  <p className={cn("text-[0.6875rem] tracking-[0.12em] uppercase", muted)}>
                    {t("delivery.pickup")}
                  </p>
                  <p className="text-sm text-[#edf1fb]">{job.storeName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#fb923c]" />
                <div>
                  <p className={cn("text-[0.6875rem] tracking-[0.12em] uppercase", muted)}>
                    {t("delivery.dropOff")}
                  </p>
                  <p className="text-sm text-[#edf1fb]">
                    {job.buyer} · {job.buyerAddress}
                  </p>
                </div>
              </div>
            </div>
            {job.status === "to_pickup" || job.status === "transit" ? (
              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-[#223047]">
                  <div
                    className="h-full rounded-full bg-[#f97316] transition-[width] duration-500"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <p className={cn("mt-2 flex items-center gap-1 text-xs", muted)}>
                  <Clock className="size-3.5" />{" "}
                  {t("delivery.timeRemaining", { time: etaText(job, now, t) })}
                </p>
              </div>
            ) : null}
          </div>
          <div className="p-5">
            {job.status === "assigned" ? (
              <button
                type="button"
                className={cn(btnPrimary, "w-full")}
                onClick={() => acceptDelivery(job.id)}
              >
                {t("delivery.acceptDelivery")}
              </button>
            ) : job.status === "accepted" ? (
              <button
                type="button"
                className={cn(btnPrimary, "w-full")}
                onClick={() => startPickup(job.id)}
              >
                {t("delivery.headToPickup")}
              </button>
            ) : job.status === "to_pickup" ? (
              <button type="button" className={cn(btnPrimary, "w-full")} disabled>
                {t("delivery.drivingToStudio")}
              </button>
            ) : job.status === "at_pickup" ? (
              <button
                type="button"
                className={cn(btnPrimary, "w-full")}
                onClick={() => confirmPickup(job.id)}
              >
                {t("delivery.pickUpAndStart")}
              </button>
            ) : (
              <button
                type="button"
                className={cn(btnPrimary, "w-full")}
                onClick={() => completeDelivery(job.id)}
              >
                <CheckCircle2 className="size-4" /> {t("delivery.completeDelivery")}
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className={cn(panel, "p-6 text-center")}>
          <CheckCircle2 className="mx-auto size-8 text-[#4ade80]" />
          <p className="mt-3 font-display text-lg font-semibold text-[#edf1fb]">
            {t("delivery.allCaughtUp")}
          </p>
          <p className={cn("mt-1 text-sm", muted)}>{t("delivery.newAssignmentsHere")}</p>
        </section>
      )}
    </div>
  );
}

export function BuyerView({ onFocus }: ViewProps) {
  const t = useT();
  const { state, now } = useDelivery();
  const [selectedId, setSelectedId] = useState("dl-1");
  const delivery = state.deliveries.find((d) => d.id === selectedId) ?? state.deliveries[0];
  const agent = state.agents.find((a) => a.id === delivery?.agentId) ?? null;

  useEffect(() => onFocus(delivery?.id ?? null), [delivery?.id, onFocus]);

  if (!delivery) return <p className={muted}>{t("delivery.noDeliveries")}</p>;

  const stepIndex = STATUS_ORDER.indexOf(delivery.status);

  return (
    <div className="space-y-5">
      <div className={cn(panel, "flex flex-wrap items-center justify-between gap-3 p-4")}>
        <div>
          <p className={cn("text-[0.6875rem] tracking-[0.12em] uppercase", muted)}>
            {t("delivery.trackingOrder")}
          </p>
          <p className="font-mono text-lg text-[#edf1fb]">{delivery.orderNumber}</p>
        </div>
        <select
          className={cn(input, "w-auto")}
          value={delivery.id}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-label={t("delivery.chooseOrder")}
        >
          {state.deliveries.map((d) => (
            <option key={d.id} value={d.id}>
              {d.orderNumber}
            </option>
          ))}
        </select>
      </div>

      <section className={cn(panel, "p-5")}>
        <div className="flex items-center justify-between gap-2">
          <StatusPill status={delivery.status} />
          <span className={cn("flex items-center gap-1 text-sm font-semibold text-[#fb923c]")}>
            <Clock className="size-4" /> {etaText(delivery, now, t)}
          </span>
        </div>

        <ol className="mt-5 space-y-0">
          {STATUS_ORDER.map((s, i) => {
            const done = i <= stepIndex && delivery.status !== "pending";
            const current = i === stepIndex;
            return (
              <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
                {i < STATUS_ORDER.length - 1 ? (
                  <span
                    className={cn(
                      "absolute top-5 left-[9px] h-full w-px",
                      done ? "bg-[#f97316]" : "bg-[#223047]",
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 grid size-5 shrink-0 place-items-center rounded-full border-2",
                    done ? "border-[#f97316] bg-[#f97316]" : "border-[#2a3a5f] bg-[#0d1222]",
                    current && "ring-4 ring-[#f97316]/25",
                  )}
                >
                  {done ? <CheckCircle2 className="size-3 text-[#0a0f1d]" /> : null}
                </span>
                <div>
                  <p className={cn("text-sm font-medium", done ? "text-[#edf1fb]" : muted)}>
                    {t(STATUS_LABEL_KEYS[s])}
                  </p>
                  {current ? (
                    <p className={cn("text-xs", muted)}>{t(LIVE_NOTE_KEYS[delivery.status])}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {agent ? (
        <section className={cn(panel, "flex flex-wrap items-center gap-3 p-4")}>
          <span className="grid size-12 place-items-center rounded-full bg-[#16233a] font-display text-base font-semibold text-[#60a5fa]">
            {agent.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#edf1fb]">{agent.name}</p>
            <p className={cn("text-xs", muted)}>
              {agent.vehicle} · {agent.plate}
            </p>
          </div>
          <span className={cn("flex items-center gap-1 text-xs", muted)}>
            <Star className="size-3.5 text-[#fbbf24]" /> {agent.rating}
          </span>
          <a
            href={`tel:${agent.phone.replace(/\s/g, "")}`}
            className={btnGhost}
            aria-label={t("delivery.callCourier", { name: agent.name })}
          >
            <Phone className="size-4" /> {t("delivery.call")}
          </a>
        </section>
      ) : null}

      <section className={cn(panel, "p-5")}>
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-[#edf1fb]">
          <Package className="size-4 text-[#f97316]" />{" "}
          {t("common.countNoun", {
            count: delivery.items.length,
            noun: t(delivery.items.length === 1 ? "common.item" : "common.items"),
          })}{" "}
          · {delivery.total}
        </h2>
        <ul className="mt-3 space-y-1">
          {delivery.items.map((it) => (
            <li key={it} className={cn("flex items-center gap-2 text-sm", muted)}>
              <UserRound className="size-3.5" /> {it}
            </li>
          ))}
        </ul>
        <p className={cn("mt-3 flex items-center gap-2 text-xs", muted)}>
          <MapPin className="size-3.5 text-[#fb923c]" /> {delivery.buyerAddress}
        </p>
      </section>
    </div>
  );
}
