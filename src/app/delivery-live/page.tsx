import type { Metadata } from "next";
import { Suspense } from "react";

import { DeliveryHub } from "@/components/delivery/delivery-hub";

export const metadata: Metadata = {
  title: "Live delivery",
  description:
    "Track your package in real time. Sellers dispatch couriers, delivery agents run the route, and buyers watch the vehicle move on the map.",
  robots: { index: false, follow: false },
};

type Persona = "seller" | "courier" | "buyer";

function parsePersona(value: string | string[] | undefined): Persona {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "seller" || raw === "courier" || raw === "buyer" ? raw : "buyer";
}

export default function DeliveryLivePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<DeliveryHubFallback />}>
      <DeliveryLiveContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DeliveryLiveContent({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const persona = parsePersona(params.persona);

  return <DeliveryHub initialPersona={persona} />;
}

function DeliveryHubFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#070a14] text-[#a7b1c7]">
      <div className="flex flex-col items-center gap-4">
        <span className="relative flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f97316] opacity-60" />
          <span className="relative inline-flex size-3 rounded-full bg-[#f97316]" />
        </span>
        <p className="font-mono text-xs tracking-[0.18em] uppercase">Connecting live map…</p>
      </div>
    </div>
  );
}
