"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

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
      setLocationMessage(
        "This browser does not support device location. Enter the address manually.",
      );
      return;
    }

    setLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setLocationMessage(
          `Location captured (about ${Math.round(position.coords.accuracy)} m accuracy).`,
        );
        setLocating(false);
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was not granted. Enable it in your browser settings or enter the address manually."
            : error.code === error.TIMEOUT
              ? "Finding your location timed out. Try again or enter the address manually."
              : "Your location could not be read. Check device location settings or enter the address manually.";
        setLocationMessage(message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  function clearCoordinates() {
    setLatitude("");
    setLongitude("");
    setLocationMessage("Using the address text to preview the map.");
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="latitude" value={latitude} />
      <input type="hidden" name="longitude" value={longitude} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City or town" htmlFor="studio-city" error={errors?.city}>
          <Input
            id="studio-city"
            name="city"
            value={city}
            onChange={(event) => setCity(event.currentTarget.value)}
            required
            minLength={2}
            maxLength={80}
            placeholder="Dar es Salaam"
          />
        </Field>
        <Field label="Street" htmlFor="studio-street" error={errors?.street}>
          <Input
            id="studio-street"
            name="street"
            value={street}
            onChange={(event) => setStreet(event.currentTarget.value)}
            required
            minLength={2}
            maxLength={120}
            placeholder="Samora Avenue"
          />
        </Field>
      </div>
      <Field
        label="Street address, building, or plot"
        htmlFor="studio-address"
        hint="Add the building or house number and any detail that helps customers find the studio."
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
          placeholder="Plot 12, Mlimani Tower, 3rd floor"
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
          {locating ? "Finding location…" : "Use my current location"}
        </Button>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {locationMessage || "Optional: allow location access to place a more accurate map pin."}
        </p>
        {coordinates ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearCoordinates}>
            Clear map pin
          </Button>
        ) : null}
      </div>
      <iframe
        key={mapUrl}
        title={query ? `Google Maps preview of ${query}` : "Google Maps location preview"}
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
          Check this location in Google Maps
        </a>
      ) : null}
    </div>
  );
}
