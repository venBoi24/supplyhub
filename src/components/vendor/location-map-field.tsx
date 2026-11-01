"use client";

import { useState } from "react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LocationMapField({
  defaultValue,
  error,
}: {
  defaultValue: string;
  error?: string;
}) {
  const [location, setLocation] = useState(defaultValue);
  const query = location.trim();
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query || "Tanzania")}&output=embed`;

  return (
    <div className="space-y-3">
      <Field
        label="Studio location"
        htmlFor="studio-location"
        hint="Enter the city, neighborhood, or full address. The map updates as you choose a location."
        error={error}
      >
        <Input
          id="studio-location"
          name="location"
          value={location}
          onChange={(event) => setLocation(event.currentTarget.value)}
          required
          maxLength={80}
          placeholder="City, neighborhood, or street address"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "studio-location-error" : undefined}
        />
      </Field>
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
          Choose or confirm this location in Google Maps
        </a>
      ) : null}
    </div>
  );
}
