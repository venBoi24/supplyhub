"use client";

import { useActionState, useMemo, useState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/features/catalog/money";
import { placeOrderAction } from "@/features/checkout/actions";
import { initialFormState } from "@/features/identity/form-state";

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
  const errors = state.fieldErrors ?? {};
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);

  const ratePerKmCents = 20000;
  const minimumFeeCents = 50000;

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError("This browser does not support location access.");
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
        setLocationError("Location access was denied or unavailable.");
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
        <Field label="Full name" htmlFor="recipientName" error={errors.recipientName}>
          <Input
            id="recipientName"
            name="recipientName"
            autoComplete="name"
            defaultValue={defaultName}
            required
            {...inputProps("recipientName")}
          />
        </Field>
        <Field label="Email" htmlFor="contactEmail" error={errors.contactEmail}>
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
          label="Phone"
          htmlFor="contactPhone"
          hint="Optional"
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
          label="Street address"
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
          label="Apartment, suite, or unit"
          htmlFor="addressLine2"
          hint="Optional"
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
        <Field label="City" htmlFor="city" error={errors.city}>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
            required
            {...inputProps("city")}
          />
        </Field>
        <Field label="State, region, or province" htmlFor="region" error={errors.region}>
          <Input
            id="region"
            name="region"
            autoComplete="address-level1"
            required
            {...inputProps("region")}
          />
        </Field>
        <Field label="Postal code" htmlFor="postalCode" error={errors.postalCode}>
          <Input
            id="postalCode"
            name="postalCode"
            autoComplete="postal-code"
            required
            {...inputProps("postalCode")}
          />
        </Field>
        <Field
          label="Country code"
          htmlFor="countryCode"
          hint="Two letters, e.g. US"
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
        <legend className="eyebrow text-muted-foreground">Fulfillment</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4">
            <input
              type="radio"
              name="fulfillmentMethod"
              value="PICKUP"
              checked={deliveryMethod === "PICKUP"}
              onChange={() => setDeliveryMethod("PICKUP")}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Pickup from studio</span>
              <span className="block text-sm text-muted-foreground">
                Collect the object directly from each studio. No delivery fee.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4">
            <input
              type="radio"
              name="fulfillmentMethod"
              value="DELIVERY"
              checked={deliveryMethod === "DELIVERY"}
              onChange={() => setDeliveryMethod("DELIVERY")}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">Delivery</span>
              <span className="block text-sm text-muted-foreground">
                Delivered to the address above. Price depends on distance.
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
                {requestingLocation ? "Finding location…" : "Use my location"}
              </button>
              {location ? (
                <span className="text-sm text-muted-foreground">
                  Location captured: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                </span>
              ) : null}
            </div>
            {locationError ? <p className="text-sm text-danger">{locationError}</p> : null}
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
                      <span className="text-danger">Delivery unavailable</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
            {deliveryBlocked ? (
              <p className="text-sm text-danger">
                Use your location before placing a delivery order.
              </p>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <FormMessage state={state} />

      <div className="border-t border-border pt-6">
        <SubmitButton pendingLabel="Reserving your order…" size="lg" disabled={deliveryBlocked}>
          Place order
        </SubmitButton>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Payment is collected through LynxPay on the order page in Tanzanian shillings. The order
          holds its stock reservation for {reservationMinutes} minutes while you pay. Delivery is
          calculated when you choose delivery; tax is not calculated.
        </p>
      </div>
    </form>
  );
}
