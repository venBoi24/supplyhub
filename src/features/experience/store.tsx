"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import {
  emptyState,
  type ExperienceState,
  type ExperienceTab,
  type NotificationKind,
  type ProductReview,
  type SandboxOrder,
  type SandboxOrderItem,
  type SandboxPaymentMethod,
  type SavedAddress,
  type WatchSnapshot,
} from "./types";
import { useHydrated } from "./use-hydrated";

const STORAGE_KEY = "supplyhub-experience-v1";
const CHANNEL = "supplyhub-experience";

interface ExperienceContextValue {
  state: ExperienceState;
  toggleWishlist: (item: WatchSnapshot) => void;
  checkWatch: (listings: WatchSnapshot[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  openChat: (vendorSlug: string, vendorName: string) => void;
  sendChat: (vendorSlug: string, text: string) => void;
  markChatRead: (vendorSlug: string) => void;
  addAddress: (address: Omit<SavedAddress, "id">) => void;
  removeAddress: (id: string) => void;
  setGuestEmail: (email: string) => void;
  enableTwoFactor: () => string;
  disableTwoFactor: () => void;
  verifyPhone: (phone: string) => void;
  recordLoginAlert: (device: string, location: string) => void;
  placeOrder: (input: {
    email: string;
    items: SandboxOrderItem[];
    address: SavedAddress;
    paymentMethod: SandboxPaymentMethod;
    paymentPhone: string;
    shippingCents: number;
    pickup: { lat: number; lng: number };
    dropoff: { lat: number; lng: number };
  }) => string;
  verifyOtp: (orderId: string, code: string) => boolean;
  confirmReceipt: (orderId: string) => void;
  requestReturn: (orderId: string, reason: string, detail: string) => void;
  submitReview: (slug: string, review: Omit<ProductReview, "id" | "at" | "sellerReply">) => void;
  resetExperience: () => void;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

interface Snapshot {
  state: ExperienceState;
}

const serverSnapshot: Snapshot = { state: emptyState() };
let snapshot: Snapshot = serverSnapshot;
let started = false;
let channel: BroadcastChannel | null = null;
const listeners = new Set<() => void>();
let counter = 0;

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

function emit() {
  for (const listener of listeners) listener();
}

function readStored(): ExperienceState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExperienceState;
    if (!Array.isArray(parsed.wishlist) || !Array.isArray(parsed.orders)) return null;
    return { ...emptyState(), ...parsed };
  } catch {
    return null;
  }
}

function persist(state: ExperienceState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode: the session still works in memory.
  }
}

function commitState(state: ExperienceState) {
  snapshot = { state };
  persist(state);
  channel?.postMessage(state);
  emit();
}

function mutate(fn: (prev: ExperienceState) => ExperienceState) {
  commitState(fn(snapshot.state));
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event: MessageEvent<ExperienceState>) => {
      snapshot = { state: event.data };
      emit();
    };
  }
  // Load persisted state only after the first paint so the hydration render
  // matches the server's empty snapshot; the stored state then arrives as a
  // normal post-mount update instead of a hydration mismatch.
  window.setTimeout(() => {
    snapshot = { state: readStored() ?? emptyState() };
    emit();
  }, 0);
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

function notify(kind: NotificationKind, title: string, body: string, tab?: ExperienceTab) {
  mutate((prev) => ({
    ...prev,
    notifications: [
      { id: uid("nt"), kind, title, body, at: Date.now(), read: false, tab },
      ...prev.notifications,
    ].slice(0, 60),
  }));
}

function toggleWishlist(item: WatchSnapshot) {
  mutate((prev) => {
    const has = prev.wishlist.includes(item.slug);
    const wishlist = has
      ? prev.wishlist.filter((s) => s !== item.slug)
      : [...prev.wishlist, item.slug];
    const watch = { ...prev.watch };
    if (has) delete watch[item.slug];
    else watch[item.slug] = item;
    return { ...prev, wishlist, watch };
  });
}

// Compare live catalog listings against saved snapshots and raise price-drop /
// back-in-stock alerts. Called whenever a catalog surface renders.
function checkWatch(listings: WatchSnapshot[]) {
  const current = snapshot.state;
  for (const listing of listings) {
    const saved = current.watch[listing.slug];
    if (!saved) continue;
    if (listing.priceCents < saved.priceCents) {
      notify(
        "price",
        `Price drop: ${listing.name}`,
        `Now ${Math.round(listing.priceCents / 100).toLocaleString()} vs ${Math.round(saved.priceCents / 100).toLocaleString()} when you saved it.`,
        "saved",
      );
    }
    if (saved.inventory === 0 && listing.inventory > 0) {
      notify(
        "stock",
        `Back in stock: ${listing.name}`,
        "It's available again — grab it before it goes.",
        "saved",
      );
    }
    if (listing.priceCents !== saved.priceCents || listing.inventory !== saved.inventory) {
      mutate((prev) => ({
        ...prev,
        watch: { ...prev.watch, [listing.slug]: listing },
      }));
    }
  }
}

function markRead(id: string) {
  mutate((prev) => ({
    ...prev,
    notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
  }));
}

function markAllRead() {
  mutate((prev) => ({
    ...prev,
    notifications: prev.notifications.map((n) => ({ ...n, read: true })),
  }));
}

function clearNotifications() {
  mutate((prev) => ({ ...prev, notifications: [] }));
}

function openChat(vendorSlug: string, vendorName: string) {
  mutate((prev) =>
    prev.chats[vendorSlug]
      ? prev
      : {
          ...prev,
          chats: {
            ...prev.chats,
            [vendorSlug]: { vendorSlug, vendorName, messages: [], unread: 0 },
          },
        },
  );
}

const STUDIO_REPLIES = [
  "Thanks for reaching out! Yes, that piece is available and ready to ship.",
  "Good question — we can deliver across Dar es Salaam within 24 hours.",
  "We pack every order carefully and it's covered by buyer protection.",
  "Happy to help! Anything else you'd like to know before ordering?",
];

function sendChat(vendorSlug: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  mutate((prev) => {
    const thread = prev.chats[vendorSlug] ?? {
      vendorSlug,
      vendorName: vendorSlug,
      messages: [],
      unread: 0,
    };
    return {
      ...prev,
      chats: {
        ...prev.chats,
        [vendorSlug]: {
          ...thread,
          messages: [
            ...thread.messages,
            { id: uid("msg"), from: "buyer", text: trimmed, at: Date.now() },
          ],
        },
      },
    };
  });
  // Simulated studio reply so the inbox is demonstrable end to end.
  window.setTimeout(() => {
    const reply = STUDIO_REPLIES[Math.floor(Math.random() * STUDIO_REPLIES.length)]!;
    mutate((prev) => {
      const thread = prev.chats[vendorSlug];
      if (!thread) return prev;
      return {
        ...prev,
        chats: {
          ...prev.chats,
          [vendorSlug]: {
            ...thread,
            unread: thread.unread + 1,
            messages: [
              ...thread.messages,
              { id: uid("msg"), from: "studio", text: reply, at: Date.now() },
            ],
          },
        },
      };
    });
    notify(
      "chat",
      `New message from ${snapshot.state.chats[vendorSlug]?.vendorName ?? "studio"}`,
      reply,
      "inbox",
    );
  }, 1500);
}

function markChatRead(vendorSlug: string) {
  mutate((prev) => {
    const thread = prev.chats[vendorSlug];
    if (!thread) return prev;
    return { ...prev, chats: { ...prev.chats, [vendorSlug]: { ...thread, unread: 0 } } };
  });
}

function addAddress(address: Omit<SavedAddress, "id">) {
  mutate((prev) => ({
    ...prev,
    addresses: [...prev.addresses, { ...address, id: uid("addr") }],
  }));
}

function removeAddress(id: string) {
  mutate((prev) => ({ ...prev, addresses: prev.addresses.filter((a) => a.id !== id) }));
}

function setGuestEmail(email: string) {
  mutate((prev) => ({ ...prev, guestEmail: email }));
}

function enableTwoFactor(): string {
  const secret = Array.from({ length: 16 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32)),
  ).join("");
  mutate((prev) => ({
    ...prev,
    security: { ...prev.security, twoFactorEnabled: true, twoFactorSecret: secret },
  }));
  notify(
    "security",
    "Two-factor authentication on",
    "Your account now asks for a code at sign-in.",
    "security",
  );
  return secret;
}

function disableTwoFactor() {
  mutate((prev) => ({
    ...prev,
    security: { ...prev.security, twoFactorEnabled: false, twoFactorSecret: null },
  }));
  notify(
    "security",
    "Two-factor authentication off",
    "We recommend keeping 2FA enabled.",
    "security",
  );
}

function verifyPhone(phone: string) {
  mutate((prev) => ({
    ...prev,
    security: { ...prev.security, phoneVerified: true, phoneNumber: phone },
  }));
  notify("security", "Phone verified", "Delivery couriers can now reach you reliably.", "security");
}

function recordLoginAlert(device: string, location: string) {
  mutate((prev) => ({
    ...prev,
    security: {
      ...prev.security,
      loginAlerts: [
        { id: uid("login"), at: Date.now(), device, location },
        ...prev.security.loginAlerts,
      ].slice(0, 12),
    },
  }));
  notify("security", "New sign-in detected", `${device} · ${location}`, "security");
}

function placeOrder(input: {
  email: string;
  items: SandboxOrderItem[];
  address: SavedAddress;
  paymentMethod: SandboxPaymentMethod;
  paymentPhone: string;
  shippingCents: number;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
}): string {
  const subtotal = input.items.reduce((sum, it) => sum + it.priceCents * it.quantity, 0);
  const id = uid("ord");
  const order: SandboxOrder = {
    id,
    number: `SH-${Math.floor(10000 + Math.random() * 89999)}`,
    email: input.email,
    items: input.items,
    subtotalCents: subtotal,
    shippingCents: input.shippingCents,
    totalCents: subtotal + input.shippingCents,
    currency: "TZS",
    address: input.address,
    paymentMethod: input.paymentMethod,
    paymentPhone: input.paymentPhone,
    status: "held",
    otp: String(Math.floor(1000 + Math.random() * 9000)),
    otpVerified: false,
    escrowReleasedAt: null,
    createdAt: Date.now(),
    milestones: [{ key: "paid", label: "Payment received · held in protection", at: Date.now() }],
    returnRequest: null,
    pickup: input.pickup,
    dropoff: input.dropoff,
    agentStart: {
      lat: (input.pickup.lat + input.dropoff.lat) / 2,
      lng: (input.pickup.lng + input.dropoff.lng) / 2 - 0.01,
    },
    legStartedAt: 0,
    legDurationMs: 45_000,
  };
  mutate((prev) => ({ ...prev, orders: [order, ...prev.orders], guestEmail: input.email }));
  notify(
    "escrow",
    "Payment protected",
    `${order.number}: funds are held until you confirm delivery.`,
    "protection",
  );
  notify("order", "Order placed", `${order.number} is being prepared by the studio.`, "orders");

  window.setTimeout(() => {
    mutate((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === id && o.status === "held"
          ? {
              ...o,
              status: "processing",
              milestones: [
                ...o.milestones,
                { key: "processing", label: "Studio is preparing your order", at: Date.now() },
              ],
            }
          : o,
      ),
    }));
    notify(
      "order",
      "Order being prepared",
      `${order.number}: the studio is packing your items.`,
      "orders",
    );
  }, 3000);

  window.setTimeout(() => {
    mutate((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === id && o.status === "processing"
          ? {
              ...o,
              status: "shipped",
              legStartedAt: Date.now(),
              milestones: [
                ...o.milestones,
                { key: "shipped", label: "Courier collected · on the way", at: Date.now() },
              ],
            }
          : o,
      ),
    }));
    notify(
      "delivery",
      "Out for delivery",
      `${order.number}: your courier is on the way. Track live.`,
      "orders",
    );
  }, 7000);

  return id;
}

function verifyOtp(orderId: string, code: string): boolean {
  const order = snapshot.state.orders.find((o) => o.id === orderId);
  if (!order || order.otp !== code.trim()) return false;
  mutate((prev) => ({
    ...prev,
    orders: prev.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            otpVerified: true,
            status: "delivered",
            milestones: [
              ...o.milestones,
              { key: "delivered", label: "Delivered · OTP verified", at: Date.now() },
            ],
          }
        : o,
    ),
  }));
  notify(
    "delivery",
    "Delivered",
    `${order.number}: courier confirmed hand-over with your code.`,
    "orders",
  );
  return true;
}

function confirmReceipt(orderId: string) {
  const order = snapshot.state.orders.find((o) => o.id === orderId);
  if (!order) return;
  mutate((prev) => ({
    ...prev,
    orders: prev.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: "completed",
            escrowReleasedAt: Date.now(),
            milestones: [
              ...o.milestones,
              {
                key: "completed",
                label: "You confirmed receipt · payment released",
                at: Date.now(),
              },
            ],
          }
        : o,
    ),
  }));
  notify(
    "escrow",
    "Payment released",
    `${order.number}: you confirmed receipt, so the studio has been paid.`,
    "protection",
  );
}

function requestReturn(orderId: string, reason: string, detail: string) {
  const order = snapshot.state.orders.find((o) => o.id === orderId);
  if (!order) return;
  mutate((prev) => ({
    ...prev,
    orders: prev.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: "return_requested",
            returnRequest: { reason, detail, status: "requested", at: Date.now() },
            milestones: [
              ...o.milestones,
              { key: "return", label: `Return requested: ${reason}`, at: Date.now() },
            ],
          }
        : o,
    ),
  }));
  notify(
    "return",
    "Return requested",
    `${order.number}: we're reviewing your return.`,
    "protection",
  );
  window.setTimeout(() => {
    mutate((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId && o.returnRequest
          ? {
              ...o,
              status: "returned",
              returnRequest: { ...o.returnRequest, status: "approved" },
              milestones: [
                ...o.milestones,
                { key: "return_approved", label: "Return approved", at: Date.now() },
              ],
            }
          : o,
      ),
    }));
    notify(
      "return",
      "Return approved",
      `${order.number}: send the item back; refund follows.`,
      "protection",
    );
  }, 4000);
  window.setTimeout(() => {
    mutate((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId && o.returnRequest
          ? {
              ...o,
              status: "refunded",
              escrowReleasedAt: null,
              returnRequest: { ...o.returnRequest, status: "refunded" },
              milestones: [
                ...o.milestones,
                { key: "refunded", label: "Refunded to your payment method", at: Date.now() },
              ],
            }
          : o,
      ),
    }));
    notify(
      "escrow",
      "Refund issued",
      `${order.number}: protected funds returned to you.`,
      "protection",
    );
  }, 8000);
}

function submitReview(slug: string, review: Omit<ProductReview, "id" | "at" | "sellerReply">) {
  mutate((prev) => ({
    ...prev,
    reviews: {
      ...prev.reviews,
      [slug]: [
        { ...review, id: uid("rev"), at: Date.now(), sellerReply: null },
        ...(prev.reviews[slug] ?? []),
      ],
    },
  }));
  notify("order", "Review published", "Thanks — your verified-purchase review is live.", "reviews");
  window.setTimeout(() => {
    mutate((prev) => ({
      ...prev,
      reviews: {
        ...prev.reviews,
        [slug]: (prev.reviews[slug] ?? []).map((r) =>
          r.orderNumber === review.orderNumber && !r.sellerReply
            ? { ...r, sellerReply: "Thank you for the kind words! We're glad it arrived safely." }
            : r,
        ),
      },
    }));
  }, 4000);
}

function resetExperience() {
  commitState(emptyState());
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useHydrated();
  const value = useMemo<ExperienceContextValue>(
    () => ({
      // Until mounted, expose the empty server snapshot so the hydration render
      // matches the server; persisted device state then arrives as an update.
      state: hydrated ? snap.state : serverSnapshot.state,
      toggleWishlist,
      checkWatch,
      markRead,
      markAllRead,
      clearNotifications,
      openChat,
      sendChat,
      markChatRead,
      addAddress,
      removeAddress,
      setGuestEmail,
      enableTwoFactor,
      disableTwoFactor,
      verifyPhone,
      recordLoginAlert,
      placeOrder,
      verifyOtp,
      confirmReceipt,
      requestReturn,
      submitReview,
      resetExperience,
    }),
    [snap, hydrated],
  );
  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience(): ExperienceContextValue {
  const ctx = useContext(ExperienceContext);
  if (!ctx) throw new Error("useExperience must be used within ExperienceProvider");
  return ctx;
}
