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

import { cn } from "@/lib/utils/cn";

import {
  legProgress,
  STATUS_LABEL,
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

const LIVE_NOTE: Record<DeliveryStatus, string> = {
  pending: "Waiting for the studio to dispatch a courier.",
  assigned: "A courier has been assigned to your order.",
  accepted: "Your courier accepted the job.",
  to_pickup: "Your courier is heading to the studio.",
  at_pickup: "Your courier is collecting your package.",
  transit: "Your package is moving on the map.",
  delivered: "Package handed over. Enjoy!",
};

function StatusPill({ status }: { status: DeliveryStatus }) {
  return (
    <span
      className={cn("rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold", statusTone[status])}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function etaText(d: Delivery, now: number): string {
  if (d.status === "delivered") return "Delivered";
  if (d.status !== "transit" && d.status !== "to_pickup") return "Waiting for courier";
  const remaining = Math.max(0, d.legDurationMs - (now - d.legStartedAt));
  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

interface ViewProps {
  onFocus: (id: string | null) => void;
}

export function VendorView({ onFocus }: ViewProps) {
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
          { label: "Couriers online", value: online },
          { label: "Active deliveries", value: active },
          { label: "Delivered", value: delivered },
        ].map((s) => (
          <div key={s.label} className={cn(panel, "p-4")}>
            <p className={cn("text-[0.6875rem] tracking-[0.12em] uppercase", muted)}>{s.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-[#edf1fb]">{s.value}</p>
          </div>
        ))}
      </div>

      <section className={cn(panel, "p-5")}>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-[#edf1fb]">
          <Bike className="size-5 text-[#f97316]" /> Your delivery team
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
                <Star className="size-3.5 text-[#fbbf24]" /> {a.rating} · {a.trips} trips
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
                {a.status === "online" ? "Online" : "Offline"}
              </button>
              <button
                type="button"
                onClick={() => removeAgent(a.id)}
                className={btnGhost}
                aria-label={`Remove ${a.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-2">
          <input
            className={input}
            placeholder="Courier name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Courier name"
          />
          <input
            className={input}
            placeholder="Vehicle (e.g. Motorbike)"
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            aria-label="Vehicle"
          />
          <input
            className={input}
            placeholder="Plate number"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            aria-label="Plate number"
          />
          <input
            className={input}
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-label="Phone"
          />
          <button type="submit" className={cn(btnPrimary, "sm:col-span-2")}>
            <Plus className="size-4" /> Add courier
          </button>
        </form>
      </section>

      <section className={cn(panel, "p-5")}>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-[#edf1fb]">
          <Package className="size-5 text-[#f97316]" /> Dispatch board
        </h2>
        {pending.length === 0 ? (
          <p className={cn("mt-3 text-sm", muted)}>
            Every order has a courier. New orders appear here.
          </p>
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
                    aria-label={`Assign courier for ${d.orderNumber}`}
                  >
                    <option value="">Choose courier…</option>
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
                    Assign
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
                  <span className={cn("text-xs", muted)}>{agent?.name ?? "Unassigned"}</span>
                  <StatusPill status={d.status} />
                  <span className={cn("text-xs", muted)}>{etaText(d, now)}</span>
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}

export function AgentView({ onFocus }: ViewProps) {
  const { state, now, acceptDelivery, startPickup, confirmPickup, completeDelivery } =
    useDelivery();
  const [agentId, setAgentId] = useState("ag-1");
  const agent = state.agents.find((a) => a.id === agentId) ?? state.agents[0];
  const job =
    state.deliveries.find((d) => d.agentId === agent?.id && d.status !== "delivered") ?? null;

  useEffect(() => onFocus(job?.id ?? null), [job?.id, onFocus]);

  if (!agent) return <p className={muted}>No courier profile yet. Add one from the seller view.</p>;

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
          aria-label="Switch courier profile"
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
          { label: "Rating", value: agent.rating.toFixed(1) },
          { label: "Trips", value: agent.trips },
          { label: "Today", value: "TZS 38,000" },
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
                    Pickup
                  </p>
                  <p className="text-sm text-[#edf1fb]">{job.storeName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#fb923c]" />
                <div>
                  <p className={cn("text-[0.6875rem] tracking-[0.12em] uppercase", muted)}>
                    Drop-off
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
                  <Clock className="size-3.5" /> {etaText(job, now)} remaining
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
                Accept delivery
              </button>
            ) : job.status === "accepted" ? (
              <button
                type="button"
                className={cn(btnPrimary, "w-full")}
                onClick={() => startPickup(job.id)}
              >
                Head to pickup
              </button>
            ) : job.status === "to_pickup" ? (
              <button type="button" className={cn(btnPrimary, "w-full")} disabled>
                Driving to the studio…
              </button>
            ) : job.status === "at_pickup" ? (
              <button
                type="button"
                className={cn(btnPrimary, "w-full")}
                onClick={() => confirmPickup(job.id)}
              >
                Pick up & start delivery
              </button>
            ) : (
              <button
                type="button"
                className={cn(btnPrimary, "w-full")}
                onClick={() => completeDelivery(job.id)}
              >
                <CheckCircle2 className="size-4" /> Complete delivery
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className={cn(panel, "p-6 text-center")}>
          <CheckCircle2 className="mx-auto size-8 text-[#4ade80]" />
          <p className="mt-3 font-display text-lg font-semibold text-[#edf1fb]">
            You&apos;re all caught up
          </p>
          <p className={cn("mt-1 text-sm", muted)}>New assignments from your seller appear here.</p>
        </section>
      )}
    </div>
  );
}

export function BuyerView({ onFocus }: ViewProps) {
  const { state, now } = useDelivery();
  const [selectedId, setSelectedId] = useState("dl-1");
  const delivery = state.deliveries.find((d) => d.id === selectedId) ?? state.deliveries[0];
  const agent = state.agents.find((a) => a.id === delivery?.agentId) ?? null;

  useEffect(() => onFocus(delivery?.id ?? null), [delivery?.id, onFocus]);

  if (!delivery) return <p className={muted}>No deliveries to track yet.</p>;

  const stepIndex = STATUS_ORDER.indexOf(delivery.status);

  return (
    <div className="space-y-5">
      <div className={cn(panel, "flex flex-wrap items-center justify-between gap-3 p-4")}>
        <div>
          <p className={cn("text-[0.6875rem] tracking-[0.12em] uppercase", muted)}>
            Tracking order
          </p>
          <p className="font-mono text-lg text-[#edf1fb]">{delivery.orderNumber}</p>
        </div>
        <select
          className={cn(input, "w-auto")}
          value={delivery.id}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-label="Choose order to track"
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
            <Clock className="size-4" /> {etaText(delivery, now)}
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
                    {STATUS_LABEL[s]}
                  </p>
                  {current ? (
                    <p className={cn("text-xs", muted)}>{LIVE_NOTE[delivery.status]}</p>
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
            aria-label={`Call ${agent.name}`}
          >
            <Phone className="size-4" /> Call
          </a>
        </section>
      ) : null}

      <section className={cn(panel, "p-5")}>
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-[#edf1fb]">
          <Package className="size-4 text-[#f97316]" /> {delivery.items.length} items ·{" "}
          {delivery.total}
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
