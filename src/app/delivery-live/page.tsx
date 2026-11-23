import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";

import { DeliveryHub } from "@/components/delivery/delivery-hub";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("footer.liveTracking"),
    description: t("delivery.metaDescription"),
    robots: { index: false, follow: false },
  };
}

type Persona = "seller" | "courier" | "buyer";

function parsePersona(value: string | string[] | undefined): Persona {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "seller" || raw === "courier" || raw === "buyer" ? raw : "buyer";
}

// Metadata reads the locale cookie, so the page intentionally streams. This
// marker keeps the prerendered shell static while the localized metadata and
// the live map resolve at request time (see Cache Components + generateMetadata).
const Connection = async () => {
  await connection();
  return null;
};

function DynamicMarker() {
  return (
    <Suspense>
      <Connection />
    </Suspense>
  );
}

export default function DeliveryLivePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <>
      <DynamicMarker />
      <Suspense fallback={<DeliveryHubFallback />}>
        <DeliveryLiveContent searchParams={searchParams} />
      </Suspense>
    </>
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

async function DeliveryHubFallback() {
  const { t } = await getServerI18n();
  return (
    <div className="grid min-h-dvh place-items-center bg-[#070a14] text-[#a7b1c7]">
      <div className="flex flex-col items-center gap-4">
        <span className="relative flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#f97316] opacity-60" />
          <span className="relative inline-flex size-3 rounded-full bg-[#f97316]" />
        </span>
        <p className="font-mono text-xs tracking-[0.18em] uppercase">{t("delivery.connecting")}</p>
      </div>
    </div>
  );
}

export const instant = false;
