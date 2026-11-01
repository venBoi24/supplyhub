"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

export interface QuantityStepperProps {
  max?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  name?: string;
  disabled?: boolean;
}

export function QuantityStepper({
  max = 10,
  value,
  defaultValue = 1,
  onChange,
  name,
  disabled = false,
}: QuantityStepperProps) {
  const [internal, setInternal] = useState(defaultValue);
  const quantity = value ?? internal;
  const limit = Math.max(1, Math.min(max, 10));

  function update(next: number) {
    const clamped = Math.max(1, Math.min(limit, next));

    if (value === undefined) {
      setInternal(clamped);
    }

    onChange?.(clamped);
  }

  return (
    <div className="inline-flex h-11 items-center rounded-md border border-border bg-surface">
      <button
        type="button"
        onClick={() => update(quantity - 1)}
        disabled={disabled || quantity <= 1}
        className="grid h-full w-11 place-items-center rounded-l-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        aria-label="Decrease quantity"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span
        aria-live="polite"
        className="min-w-9 border-x border-border px-2 text-center text-sm tabular-nums"
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => update(quantity + 1)}
        disabled={disabled || quantity >= limit}
        className="grid h-full w-11 place-items-center rounded-r-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        aria-label="Increase quantity"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
      {name ? <input type="hidden" name={name} value={quantity} /> : null}
    </div>
  );
}
