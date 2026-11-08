"use client";

import { useState } from "react";
import { Bike, MapPinned, RotateCcw, Store, UserRound } from "lucide-react";

import { Wordmark } from "@/components/storefront/wordmark";
import { cn } from "@/lib/utils/cn";

import { DeliveryMap } from "./delivery-map";
import { DeliveryProvider, useDelivery } from "./store";
import { AgentView, BuyerView, VendorView } from "./views";

type Persona = "seller" | "courier" | "buyer";

const personas: { id: Persona; label: string; icon: typeof Store }[] = [
  { id: "seller", label: "Seller", icon: Store },
  { id: "courier", label: "Delivery agent", icon: Bike },
  { id: "buyer", label: "Buyer", icon: UserRound },
];

function HubInner({ initialPersona }: { initialPersona: Persona }) {
  const [persona, setPersona] = useState<Persona>(initialPersona);
  const [focusId, setFocusId] = useState<string | null>(null);
  const { state, now, resetDemo } = useDelivery();

  return (
    <div className="min-h-dvh bg-[#070a14] text-[#edf1fb]">
      <header className="sticky top-0 z-40 border-b border-[#223047] bg-[#070a14]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Wordmark compact className="text-[#edf1fb]" />
          <span className="hidden items-center gap-1.5 rounded-full border border-[#2a3a5f] px-2.5 py-1 text-[0.6875rem] font-semibold text-[#2dd4bf] sm:inline-flex">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2dd4bf] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[#2dd4bf]" />
            </span>
            LIVE · SIMULATED GPS
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={resetDemo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a3a5f] px-2.5 py-1.5 text-xs text-[#a7b1c7] transition hover:border-[#f97316] hover:text-[#edf1fb]"
            >
              <RotateCcw className="size-3.5" /> Reset demo
            </button>
          </div>
          <nav
            aria-label="Choose perspective"
            className="flex w-full gap-1 rounded-xl border border-[#223047] bg-[#0d1222] p-1 sm:w-auto"
          >
            {personas.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPersona(p.id)}
                aria-pressed={persona === p.id}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-none",
                  persona === p.id
                    ? "bg-[#f97316] text-[#0a0f1d]"
                    : "text-[#a7b1c7] hover:text-[#edf1fb]",
                )}
              >
                <p.icon className="size-4" /> {p.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1.25fr_0.9fr] lg:items-start">
        <section
          aria-label="Live map"
          className="relative overflow-hidden rounded-2xl border border-[#223047] bg-[#0a0f1d]"
        >
          <div className="h-[320px] sm:h-[420px] lg:sticky lg:top-20 lg:h-[600px]">
            <DeliveryMap deliveries={state.deliveries} focusId={focusId} now={now} />
          </div>
          <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2 rounded-lg border border-[#223047] bg-[#070a14]/80 px-2.5 py-1.5 text-[0.6875rem] text-[#a7b1c7] backdrop-blur">
            <MapPinned className="size-3.5 text-[#f97316]" />
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-[#2dd4bf]" /> Studio
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-[#fb923c]" /> Buyer
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-[#f97316]" /> Courier
            </span>
          </div>
        </section>

        <section aria-label="Details">
          {persona === "seller" ? (
            <VendorView onFocus={setFocusId} />
          ) : persona === "courier" ? (
            <AgentView onFocus={setFocusId} />
          ) : (
            <BuyerView onFocus={setFocusId} />
          )}
        </section>
      </main>
    </div>
  );
}

export function DeliveryHub({ initialPersona = "buyer" }: { initialPersona?: Persona }) {
  return (
    <DeliveryProvider>
      <HubInner initialPersona={initialPersona} />
    </DeliveryProvider>
  );
}
