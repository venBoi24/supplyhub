"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

export function LocationMapField({
  defaultValue,
  defaultCity,
  defaultStreet,
  defaultAddress,
  defaultLatitude,
  defaultLongitude,
  errors,
}: {
  defaultValue: string;
  defaultCity: string;
  defaultStreet: string;
  defaultAddress: string;
  defaultLatitude: string;
  defaultLongitude: string;
  errors?: Record<string, string>;
}) {
  const t = useT();
  const [city, setCity] = useState(defaultCity || defaultValue);
  const [street, setStreet] = useState(defaultStreet);
  const [address, setAddress] = useState(defaultAddress);
  const [latitude, setLatitude] = useState(defaultLatitude);
  const [longitude, setLongitude] = useState(defaultLongitude);
  const [locationMessage, setLocationMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const coordinates = latitude && longitude ? `${latitude},${longitude}` : "";
  const query = coordinates || [address, street, city].filter(Boolean).join(", ");
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query || "Tanzania")}&output=embed`;

  function useDeviceLocation() {
    if (!navigator.geolocation) {
      setLocationMessage(t("studio.locationUnsupported"));
      return;
    }

    setLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setLocationMessage(
          t("studio.locationCaptured", { meters: Math.round(position.coords.accuracy) }),
        );
        setLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? t("studio.locationDenied")
            : error.code === error.TIMEOUT
              ? t("studio.locationTimeout")
              : t("studio.locationUnreadable");
        setLocationMessage(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  function clearCoordinates() {
    setLatitude("");
    setLongitude("");
    setLocationMessage(t("studio.usingAddressText"));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("studio.cityOrTown")} htmlFor="studio-city" error={errors?.city}>
          <Input
            id="studio-city"
            name="city"
            value={city}
            onChange={(event) => setCity(event.currentTarget.value)}
            required
            minLength={2}
            maxLength={80}
            placeholder={t("studio.cityPlaceholder")}
          />
        </Field>
        <Field label={t("studio.street")} htmlFor="studio-street" error={errors?.street}>
          <Input
            id="studio-street"
            name="street"
            value={street}
            onChange={(event) => setStreet(event.currentTarget.value)}
            required
            minLength={2}
            maxLength={120}
            placeholder={t("studio.streetPlaceholder")}
          />
        </Field>
      </div>
      <Field
        label={t("studio.streetAddressLabel")}
        htmlFor="studio-address"
        hint={t("studio.addressHint")}
        error={errors?.address}
      >
        <Input
          id="studio-address"
          name="address"
          value={address}
          onChange={(event) => setAddress(event.currentTarget.value)}
          required
          minLength={2}
          maxLength={160}
          placeholder={t("studio.addressPlaceholder")}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={useDeviceLocation}
          disabled={locating}
        >
          {locating ? t("studio.findingLocation") : t("studio.useMyLocation")}
        </Button>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {locationMessage || t("studio.locationOptionalHint")}
        </p>
        {coordinates ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearCoordinates}>
            {t("studio.clearMapPin")}
          </Button>
        ) : null}
      </div>
      <iframe
        key={mapUrl}
        title={query ? t("studio.mapsPreviewOf", { query }) : t("studio.mapsPreviewGeneric")}
        src={mapUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="h-64 w-full rounded-lg border border-border"
      />
      {query ? (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-accent underline underline-offset-4"
        >
          {t("studio.checkInGoogleMaps")}
        </a>
      ) : null}
    </div>
  );
}
