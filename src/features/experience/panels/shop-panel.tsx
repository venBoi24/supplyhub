"use client";

import { useState, type FormEvent } from "react";
import {
  CheckCircle2,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";

import type { ProductListing } from "@/features/catalog/types";
import { MAP_CENTER } from "@/components/delivery/model";
import { cn } from "@/lib/utils/cn";

import { useExperience } from "../store";
import { formatCents, PAYMENT_LABEL, type SandboxPaymentMethod, type SavedAddress } from "../types";

const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#0f766e] focus:outline-none";
const label = "text-[0.6875rem] font-semibold tracking-[0.1em] uppercase text-muted-foreground";

export function ShopPanel({ products }: { products: ProductListing[] }) {
  const { state, addAddress, removeAddress, placeOrder, setGuestEmail } = useExperience();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [email, setEmail] = useState(state.guestEmail);
  const [addressId, setAddressId] = useState<string>("new");
  const [addr, setAddr] = useState({
    label: "Home",
    name: "",
    phone: "",
    line1: "",
    city: "Dar es Salaam",
    region: "Kinondoni",
  });
  const [method, setMethod] = useState<SandboxPaymentMethod>("mpesa");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"cart" | "stk" | "done">("cart");
  const [placedId, setPlacedId] = useState("");

  const entries = Object.entries(cart).filter(([, q]) => q > 0);
  const items = entries.map(([slug, quantity]) => {
    const p = products.find((x) => x.slug === slug)!;
    return {
      slug,
      name: p.name,
      priceCents: p.priceCents,
      quantity,
      image: p.image.src,
      vendorSlug: p.vendorSlug,
      vendorName: p.vendor.name,
    };
  });
  const subtotal = items.reduce((s, it) => s + it.priceCents * it.quantity, 0);
  const shipping = items.length > 0 ? 300000 : 0; // configurable flat demo fee, in cents

  const setQty = (slug: string, q: number) =>
    setCart((prev) => ({ ...prev, [slug]: Math.max(0, Math.min(9, q)) }));

  const checkout = (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !email.trim()) return;
    let address: SavedAddress;
    if (addressId !== "new") {
      address = state.addresses.find((a) => a.id === addressId)!;
    } else {
      if (!addr.name.trim() || !addr.line1.trim()) return;
      address = { ...addr, id: "checkout-address" };
      addAddress(addr);
    }
    setGuestEmail(email.trim());
    setStage("stk");
    window.setTimeout(() => {
      const first = products.find((p) => p.slug === items[0]!.slug)!;
      const pickup =
        first.vendor.latitude != null && first.vendor.longitude != null
          ? { lat: first.vendor.latitude, lng: first.vendor.longitude }
          : { lat: MAP_CENTER.lat - 0.02, lng: MAP_CENTER.lng - 0.02 };
      const offset = (address.line1.length % 5) * 0.006;
      const dropoff = { lat: MAP_CENTER.lat + 0.01 + offset, lng: MAP_CENTER.lng + 0.02 + offset };
      const id = placeOrder({
        email: email.trim(),
        items,
        address,
        paymentMethod: method,
        paymentPhone: phone,
        shippingCents: shipping,
        pickup,
        dropoff,
      });
      setPlacedId(id);
      setStage("done");
      setCart({});
    }, 1800);
  };

  const placedOrder = state.orders.find((o) => o.id === placedId);

  if (stage === "done" && placedOrder) {
    return (
      <div className="rounded-2xl border border-[#0f766e]/30 bg-[#0f766e]/5 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-[#0f766e]" />
        <h2 className="mt-4 font-display text-2xl font-medium">
          Order {placedOrder.number} placed
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {PAYMENT_LABEL[placedOrder.paymentMethod]} payment of{" "}
          {formatCents(placedOrder.totalCents)} is held in buyer protection until you confirm
          delivery.
        </p>
        <div className="mx-auto mt-5 w-fit rounded-xl border border-border bg-surface px-6 py-4">
          <p className={label}>Your hand-over code</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-[#0f766e]">
            {placedOrder.otp}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Share only with your courier at the door.
          </p>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          Open <strong>Orders &amp; tracking</strong> to watch the courier live and confirm receipt.
        </p>
      </div>
    );
  }

  if (stage === "stk") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center">
        <Smartphone className="mx-auto size-10 animate-pulse text-accent" />
        <h2 className="mt-4 font-display text-xl font-medium">Approve on your handset</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a {PAYMENT_LABEL[method]} prompt to {phone || "your phone"}. Enter your PIN to
          authorise {formatCents(subtotal + shipping)}. Funds go into protection, not to the studio
          yet.
        </p>
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          Sandbox STK push · simulating…
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <section aria-label="Catalog">
        <h2 className="font-display text-lg font-medium">Add pieces to your sandbox order</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {products.slice(0, 8).map((p) => (
            <li key={p.slug} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image.src}
                alt={p.image.alt}
                className="size-16 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">{p.vendor.name}</p>
                <p className="mt-1 text-sm font-semibold text-[#0f766e]">
                  {formatCents(p.priceCents, p.currency)}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Remove one ${p.name}`}
                    onClick={() => setQty(p.slug, (cart[p.slug] ?? 0) - 1)}
                    className="grid size-6 place-items-center rounded border border-border"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">{cart[p.slug] ?? 0}</span>
                  <button
                    type="button"
                    aria-label={`Add one ${p.name}`}
                    onClick={() => setQty(p.slug, (cart[p.slug] ?? 0) + 1)}
                    className="grid size-6 place-items-center rounded border border-border"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form
        onSubmit={checkout}
        className="space-y-4 rounded-2xl border border-border bg-surface p-5"
      >
        <h2 className="flex items-center gap-2 font-display text-lg font-medium">
          <ShieldCheck className="size-5 text-[#0f766e]" /> Guest checkout
        </h2>
        <div>
          <label className={label} htmlFor="ck-email">
            Email for receipts
          </label>
          <input
            id="ck-email"
            type="email"
            required
            className={cn(input, "mt-1")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className={label} htmlFor="ck-addr">
            Deliver to
          </label>
          <select
            id="ck-addr"
            className={cn(input, "mt-1")}
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
          >
            <option value="new">New address…</option>
            {state.addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} · {a.line1}, {a.city}
              </option>
            ))}
          </select>
        </div>
        {addressId === "new" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className={input}
              placeholder="Recipient name"
              value={addr.name}
              onChange={(e) => setAddr({ ...addr, name: e.target.value })}
              aria-label="Recipient name"
            />
            <input
              className={input}
              placeholder="Phone"
              value={addr.phone}
              onChange={(e) => setAddr({ ...addr, phone: e.target.value })}
              aria-label="Phone"
            />
            <input
              className={cn(input, "sm:col-span-2")}
              placeholder="Street address"
              value={addr.line1}
              onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
              aria-label="Street address"
            />
            <input
              className={input}
              placeholder="City"
              value={addr.city}
              onChange={(e) => setAddr({ ...addr, city: e.target.value })}
              aria-label="City"
            />
            <input
              className={input}
              placeholder="Region"
              value={addr.region}
              onChange={(e) => setAddr({ ...addr, region: e.target.value })}
              aria-label="Region"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => removeAddress(addressId)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="size-3.5" /> Remove saved address
          </button>
        )}
        <fieldset>
          <legend className={label}>Pay with</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(PAYMENT_LABEL) as SandboxPaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                aria-pressed={method === m}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition",
                  method === m
                    ? "border-[#0f766e] bg-[#0f766e]/10 text-[#0f766e]"
                    : "border-border text-muted-foreground",
                )}
              >
                {m === "card" ? (
                  <CreditCard className="size-4" />
                ) : (
                  <Smartphone className="size-4" />
                )}{" "}
                {PAYMENT_LABEL[m]}
              </button>
            ))}
          </div>
        </fieldset>
        {method !== "card" ? (
          <div>
            <label className={label} htmlFor="ck-phone">
              Mobile money number
            </label>
            <input
              id="ck-phone"
              className={cn(input, "mt-1")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+255 7XX XXX XXX"
            />
          </div>
        ) : null}
        <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCents(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span>{formatCents(shipping)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
            <span>Total</span>
            <span>{formatCents(subtotal + shipping)}</span>
          </div>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#0f766e]" />
          Protected by buyer guarantee: we hold your payment until you confirm the order arrived.
        </p>
        <button
          type="submit"
          disabled={items.length === 0}
          className="w-full rounded-lg bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f766e]/90 disabled:opacity-40"
        >
          Pay {formatCents(subtotal + shipping)} · hold in protection
        </button>
      </form>
    </div>
  );
}
