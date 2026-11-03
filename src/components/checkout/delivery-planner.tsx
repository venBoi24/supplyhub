"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/features/catalog/money";

import type { CheckoutVendor } from "./checkout-form";

const STORAGE_KEY = "supplyhub.deliveryLocation";
const RATE_PER_KM_CENTS = 20000;
const MINIMUM_FEE_CENTS = 50000;

function haversineKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

export function DeliveryPlanner({
  vendors,
  currency,
}: {
  vendors: CheckoutVendor[];
  currency: string;
}) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return null;
      }

      const parsed = JSON.parse(saved) as { latitude: number; longitude: number };
      return Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)
        ? parsed
        : null;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  });
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (location) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    }
  }, [location]);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError("This browser does not support location access.");
      return;
    }

    setRequesting(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setRequesting(false);
      },
      () => {
        setLocationError("Location access was denied or unavailable.");
        setRequesting(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  const quotes = useMemo(() => {
    if (!location) {
      return [];
    }

    return vendors.map((vendor) => {
      if (vendor.latitude === null || vendor.longitude === null) {
        return { ...vendor, available: false as const, distanceKm: null, feeCents: null };
      }

      const distanceKm = haversineKm(
        location.latitude,
        location.longitude,
        vendor.latitude,
        vendor.longitude,
      );
      const feeCents = Math.max(MINIMUM_FEE_CENTS, Math.round(distanceKm * RATE_PER_KM_CENTS));

      return { ...vendor, available: true as const, distanceKm, feeCents };
    });
  }, [location, vendors]);

  const totalDistance = quotes.reduce((sum, quote) => sum + (quote.distanceKm ?? 0), 0);
  const totalFee = quotes.reduce((sum, quote) => sum + (quote.feeCents ?? 0), 0);
  const mapQuery = location
    ? `${location.latitude},${location.longitude}`
    : vendors[0]?.latitude && vendors[0]?.longitude
      ? `${vendors[0].latitude},${vendors[0].longitude}`
      : "Tanzania";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={requestLocation} disabled={requesting}>
          {requesting ? "Finding location…" : "Use my location"}
        </Button>
        {location ? (
          <p className="text-sm text-muted-foreground">
            Pinned location: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Allow location access to pin your delivery address on the map.
          </p>
        )}
      </div>

      {locationError ? <p className="text-sm text-danger">{locationError}</p> : null}

      <iframe
        key={mapQuery}
        title="Google Maps delivery location"
        src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-72 w-full rounded-lg border border-border"
      />

      {quotes.length > 0 ? (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-display text-xl font-medium tracking-[-0.02em]">Delivery quote</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {quotes.map((quote) => (
              <li key={quote.id} className="flex items-baseline justify-between gap-3">
                <span>{quote.name}</span>
                {quote.available ? (
                  <span className="tabular-nums">
                    {quote.distanceKm.toFixed(1)} km · {formatMoney(quote.feeCents, currency)}
                  </span>
                ) : (
                  <span className="text-danger">Delivery unavailable</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4 font-medium">
            <span>Total delivery</span>
            <span className="tabular-nums">
              {totalDistance.toFixed(1)} km · {formatMoney(totalFee, currency)}
            </span>
          </div>
        </div>
      ) : location ? (
        <p className="text-sm text-muted-foreground">
          Add items to your cart to see per-studio delivery distances and prices.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <a href="/checkout">Continue to checkout</a>
        </Button>
        <Button asChild variant="secondary">
          <a href="/cart">Review cart</a>
        </Button>
      </div>
    </div>
  );
}
