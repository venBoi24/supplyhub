"use client";

import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { DeliveryPlanner } from "./delivery-planner";
import { formatMoney } from "@/features/catalog/money";
import { placeOrderAction } from "@/features/checkout/actions";
import { initialFormState } from "@/features/identity/form-state";
import { useT } from "@/i18n/client";

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

export interface CheckoutVendor {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export interface CheckoutFormProps {
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
  reservationMinutes: number;
  currency: string;
  vendors: CheckoutVendor[];
}

export function CheckoutForm({
  defaultName,
  defaultEmail,
  defaultPhone,
  reservationMinutes,
  currency,
  vendors,
}: CheckoutFormProps) {
  const [state, formAction] = useActionState(placeOrderAction, initialFormState);
  const t = useT();
  const errors = state.fieldErrors ?? {};
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const saved = window.localStorage.getItem("supplyhub.deliveryLocation");
      if (!saved) {
        return null;
      }

      const parsed = JSON.parse(saved) as { latitude: number; longitude: number };
      return Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude) ? parsed : null;
    } catch {
      window.localStorage.removeItem("supplyhub.deliveryLocation");
      return null;
    }
  });
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY">(() =>
    typeof window !== "undefined" && window.localStorage.getItem("supplyhub.deliveryLocation")
      ? "DELIVERY"
      : "PICKUP",
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);

  const ratePerKmCents = 20000;
  const minimumFeeCents = 50000;

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError(t("checkout.locationUnsupported"));
      return;
    }

    setRequestingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setRequestingLocation(false);
      },
      () => {
        setLocationError(t("checkout.locationDenied"));
        setRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  const quotes = useMemo(() => {
    if (deliveryMethod !== "DELIVERY" || !location) {
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
      const feeCents = Math.max(minimumFeeCents, Math.round(distanceKm * ratePerKmCents));

      return { ...vendor, available: true as const, distanceKm, feeCents };
    });
  }, [deliveryMethod, location, vendors]);

  const deliveryBlocked =
    deliveryMethod === "DELIVERY" && (!location || quotes.some((quote) => !quote.available));

  function inputProps(field: string) {
    return {
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": errors[field] ? `${field}-error` : undefined,
    } as const;
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("checkout.fullName")} htmlFor="recipientName" error={errors.recipientName}>
          <Input
            id="recipientName"
            name="recipientName"
            autoComplete="name"
            defaultValue={defaultName}
            required
            {...inputProps("recipientName")}
          />
        </Field>
        <Field label={t("checkout.email")} htmlFor="contactEmail" error={errors.contactEmail}>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            autoComplete="email"
            defaultValue={defaultEmail}
            required
            {...inputProps("contactEmail")}
          />
        </Field>
        <Field
          label={t("checkout.phoneLabel")}
          htmlFor="contactPhone"
          hint={t("common.optional")}
          error={errors.contactPhone}
          className="sm:col-span-2"
        >
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            autoComplete="tel"
            defaultValue={defaultPhone}
            {...inputProps("contactPhone")}
          />
        </Field>
        <Field
          label={t("checkout.streetAddress")}
          htmlFor="addressLine1"
          error={errors.addressLine1}
          className="sm:col-span-2"
        >
          <Input
            id="addressLine1"
            name="addressLine1"
            autoComplete="address-line1"
            required
            {...inputProps("addressLine1")}
          />
        </Field>
        <Field
          label={t("checkout.addressLine2")}
          htmlFor="addressLine2"
          hint={t("common.optional")}
          error={errors.addressLine2}
          className="sm:col-span-2"
        >
          <Input
            id="addressLine2"
            name="addressLine2"
            autoComplete="address-line2"
            {...inputProps("addressLine2")}
          />
        </Field>
        <Field label={t("checkout.city")} htmlFor="city" error={errors.city}>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
            required
            {...inputProps("city")}
          />
        </Field>
        <Field label={t("checkout.region")} htmlFor="region" error={errors.region}>
          <Input
            id="region"
            name="region"
            autoComplete="address-level1"
            required
            {...inputProps("region")}
          />
        </Field>
        <Field label={t("checkout.postalCode")} htmlFor="postalCode" error={errors.postalCode}>
          <Input
            id="postalCode"
            name="postalCode"
            autoComplete="postal-code"
            required
            {...inputProps("postalCode")}
          />
        </Field>
        <Field
          label={t("checkout.countryCode")}
          htmlFor="countryCode"
          hint={t("checkout.countryHint")}
          error={errors.countryCode}
        >
          <Input
            id="countryCode"
            name="countryCode"
            autoComplete="country"
            maxLength={2}
            required
            {...inputProps("countryCode")}
          />
        </Field>
      </div>

      <fieldset className="space-y-4 border-t border-border pt-6">
        <legend className="eyebrow text-muted-foreground">{t("checkout.fulfillment")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4">
            <input
              type="radio"
              name="fulfillmentMethod"
              value="PICKUP"
              checked={deliveryMethod === "PICKUP"}
              onChange={() => {
                setDeliveryMethod("PICKUP");
                setShowDeliveryDialog(false);
              }}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{t("checkout.pickup")}</span>
              <span className="block text-sm text-muted-foreground">
                {t("checkout.pickupBody")}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4">
            <input
              type="radio"
              name="fulfillmentMethod"
              value="DELIVERY"
              checked={deliveryMethod === "DELIVERY"}
              onChange={() => {
                setDeliveryMethod("DELIVERY");
                setShowDeliveryDialog(true);
              }}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{t("checkout.delivery")}</span>
              <span className="block text-sm text-muted-foreground">
                {t("checkout.deliveryBody")}
              </span>
            </span>
          </label>
        </div>

        <input type="hidden" name="deliveryMethod" value={deliveryMethod} />
        {location ? (
          <>
            <input type="hidden" name="customerLatitude" value={location.latitude} />
            <input type="hidden" name="customerLongitude" value={location.longitude} />
          </>
        ) : null}

        {deliveryMethod === "DELIVERY" ? (
          <div className="space-y-3 rounded-md border border-border bg-surface-muted/40 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={requestLocation}
                disabled={requestingLocation}
                className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-border-strong disabled:opacity-50"
              >
                {requestingLocation ? t("checkout.findingLocation") : t("checkout.useMyLocation")}
              </button>
              {location ? (
                <span className="text-sm text-muted-foreground">
                  {t("checkout.locationCaptured", {
                    coordinates: `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,
                  })}
                </span>
              ) : null}
            </div>
            {locationError ? <p className="text-sm text-danger">{locationError}</p> : null}
            <Button type="button" variant="secondary" onClick={() => setShowDeliveryDialog(true)}>
              {t("checkout.openDeliveryMap")}
            </Button>
            {quotes.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {quotes.map((quote) => (
                  <li key={quote.id} className="flex items-baseline justify-between gap-3">
                    <span>{quote.name}</span>
                    {quote.available ? (
                      <span className="tabular-nums">
                        {quote.distanceKm.toFixed(1)} km · {formatMoney(quote.feeCents, currency)}
                      </span>
                    ) : (
                      <span className="text-danger">{t("checkout.deliveryUnavailable")}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            {deliveryBlocked ? (
              <p className="text-sm text-danger">{t("checkout.locationRequired")}</p>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <FormMessage state={state} />

      <div className="border-t border-border pt-6">
        <SubmitButton pendingLabel={t("checkout.reserving")} size="lg" disabled={deliveryBlocked}>
          {t("checkout.placeOrder")}
        </SubmitButton>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {t("checkout.paymentNote", { minutes: reservationMinutes })}
        </p>
      </div>

      {showDeliveryDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-display text-xl font-medium tracking-[-0.02em]">
                {t("checkout.deliveryLocation")}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeliveryDialog(false)}
              >
                Close
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Pin your location on the map. Seller locations are shown below.
            </p>
            <div className="mt-6">
              <DeliveryPlanner vendors={vendors} currency={currency} />
            </div>
            {vendors.length > 0 ? (
              <div className="mt-6 rounded-xl border border-border bg-surface p-5">
                <h4 className="font-medium">Seller locations</h4>
                <ul className="mt-3 space-y-3 text-sm">
                  {vendors.map((vendor) => (
                    <li key={vendor.id} className="space-y-1">
                      <p className="font-medium">{vendor.name}</p>
                      {vendor.latitude !== null && vendor.longitude !== null ? (
                        <>
                          <p className="text-muted-foreground">
                            {vendor.latitude.toFixed(5)}, {vendor.longitude.toFixed(5)}
                          </p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${vendor.latitude},${vendor.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-accent underline underline-offset-4"
                          >
                            View on Google Maps
                          </a>
                        </>
                      ) : (
                        <p className="text-muted-foreground">Location not listed</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}
