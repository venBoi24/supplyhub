"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import {
  fetchRoadRoute,
  legProgress,
  makeSeed,
  type Delivery,
  type DeliveryAgent,
  type DeliveryState,
  type Point,
} from "./model";

const STORAGE_KEY = "supplyhub-delivery-live-v2";
const CHANNEL = "supplyhub-delivery-live";
const TICK_MS = 500;

interface DeliveryContextValue {
  state: DeliveryState;
  now: number;
  addAgent: (agent: Omit<DeliveryAgent, "id" | "rating" | "trips" | "status">) => void;
  toggleAgent: (id: string) => void;
  removeAgent: (id: string) => void;
  assignDelivery: (deliveryId: string, agentId: string) => void;
  acceptDelivery: (deliveryId: string) => void;
  startPickup: (deliveryId: string) => void;
  confirmPickup: (deliveryId: string) => void;
  completeDelivery: (deliveryId: string) => void;
  resetDemo: () => void;
}

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

interface Snapshot {
  state: DeliveryState;
  now: number;
}

// The server snapshot is deterministic so the first client render matches it,
// avoiding a hydration mismatch. The live store starts on first subscription.
const serverSnapshot: Snapshot = { state: makeSeed(0), now: 0 };
let snapshot: Snapshot = serverSnapshot;
let started = false;
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readStored(): DeliveryState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeliveryState;
    if (!Array.isArray(parsed.agents) || !Array.isArray(parsed.deliveries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: DeliveryState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode) — the live session still works in memory.
  }
}

function commitState(state: DeliveryState) {
  snapshot = { ...snapshot, state };
  persist(state);
  channel?.postMessage(state);
  emit();
}

function mutate(fn: (prev: DeliveryState) => DeliveryState) {
  commitState(fn(snapshot.state));
}

// Resolve free road geometry for a leg in the background. The delivery keeps a
// fallback route until this lands; a stale response (status changed meanwhile)
// is ignored so a finished leg never snaps back onto an old path.
function resolveRoute(id: string, a: Point, b: Point, expectStatus: Delivery["status"]) {
  void fetchRoadRoute(a, b).then((route) => {
    if (!route) return;
    mutate((prev) => ({
      ...prev,
      deliveries: prev.deliveries.map((d) =>
        d.id === id && d.status === expectStatus ? { ...d, route } : d,
      ),
    }));
  });
}

function resolveActiveRoutes(state: DeliveryState) {
  for (const d of state.deliveries) {
    if (d.status === "to_pickup" && !d.route)
      resolveRoute(d.id, d.agentStart, d.pickup, "to_pickup");
    if (d.status === "transit" && !d.route) resolveRoute(d.id, d.pickup, d.dropoff, "transit");
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  const startTime = Date.now();
  const stored = readStored();
  snapshot = { state: stored ?? makeSeed(startTime), now: startTime };
  resolveActiveRoutes(snapshot.state);

  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<DeliveryState>) => {
      snapshot = { ...snapshot, state: event.data };
      emit();
    };
  }

  window.setInterval(() => {
    const current = Date.now();
    const prev = snapshot.state;
    let changed = false;
    const deliveries = prev.deliveries.map((d) => {
      if (d.status === "to_pickup" && legProgress(d, current) >= 1) {
        changed = true;
        return { ...d, status: "at_pickup" as const };
      }
      if (d.status === "transit" && legProgress(d, current) >= 1) {
        changed = true;
        return { ...d, status: "delivered" as const };
      }
      return d;
    });
    const nextState = changed ? { ...prev, deliveries } : prev;
    snapshot = { state: nextState, now: current };
    if (changed) {
      persist(nextState);
      channel?.postMessage(nextState);
    }
    emit();
  }, TICK_MS);

  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => serverSnapshot;

function addAgent(agent: Omit<DeliveryAgent, "id" | "rating" | "trips" | "status">) {
  mutate((prev) => ({
    ...prev,
    agents: [
      ...prev.agents,
      { ...agent, id: `ag-${Date.now().toString(36)}`, rating: 5, trips: 0, status: "online" },
    ],
  }));
}

function toggleAgent(id: string) {
  mutate((prev) => ({
    ...prev,
    agents: prev.agents.map((a) =>
      a.id === id ? { ...a, status: a.status === "online" ? "offline" : "online" } : a,
    ),
  }));
}

function removeAgent(id: string) {
  mutate((prev) => ({
    agents: prev.agents.filter((a) => a.id !== id),
    deliveries: prev.deliveries.map((d) =>
      d.agentId === id && d.status !== "delivered" ? { ...d, agentId: null, status: "pending" } : d,
    ),
  }));
}

function assignDelivery(deliveryId: string, agentId: string) {
  mutate((prev) => ({
    ...prev,
    deliveries: prev.deliveries.map((d) =>
      d.id === deliveryId ? { ...d, agentId, status: "assigned" } : d,
    ),
  }));
}

function setDelivery(deliveryId: string, patch: Partial<Delivery>) {
  mutate((prev) => ({
    ...prev,
    deliveries: prev.deliveries.map((d) => (d.id === deliveryId ? { ...d, ...patch } : d)),
  }));
}

function acceptDelivery(id: string) {
  setDelivery(id, { status: "accepted" });
}

function startPickup(id: string) {
  const d = snapshot.state.deliveries.find((x) => x.id === id);
  setDelivery(id, {
    status: "to_pickup",
    legStartedAt: Date.now(),
    legDurationMs: 25_000,
    route: null,
  });
  if (d) resolveRoute(id, d.agentStart, d.pickup, "to_pickup");
}

function confirmPickup(id: string) {
  const d = snapshot.state.deliveries.find((x) => x.id === id);
  setDelivery(id, {
    status: "transit",
    legStartedAt: Date.now(),
    legDurationMs: 60_000,
    route: null,
  });
  if (d) resolveRoute(id, d.pickup, d.dropoff, "transit");
}

function completeDelivery(id: string) {
  setDelivery(id, { status: "delivered" });
}

function resetDemo() {
  const seed = makeSeed(Date.now());
  commitState(seed);
  resolveActiveRoutes(seed);
}

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const value = useMemo<DeliveryContextValue>(
    () => ({
      state: snap.state,
      now: snap.now,
      addAgent,
      toggleAgent,
      removeAgent,
      assignDelivery,
      acceptDelivery,
      startPickup,
      confirmPickup,
      completeDelivery,
      resetDemo,
    }),
    [snap],
  );

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDelivery(): DeliveryContextValue {
  const ctx = useContext(DeliveryContext);
  if (!ctx) throw new Error("useDelivery must be used within DeliveryProvider");
  return ctx;
}
