"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { adjustInventoryAction } from "@/features/catalog/vendor-actions";
import { initialFormState } from "@/features/identity/form-state";

export interface StudioMovement {
  id: string;
  delta: number;
  reason: string;
  resultingStock: number;
  note: string | null;
  createdAt: Date;
  actorName: string | null;
}

const reasonLabels: Record<string, string> = {
  INITIAL: "Opening stock",
  RESTOCK: "Restock",
  CORRECTION: "Correction",
  RETURN: "Return",
};

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function InventoryPanel({
  productId,
  stock,
  movements,
  canAdjust,
}: {
  productId: string;
  stock: number;
  movements: StudioMovement[];
  canAdjust: boolean;
}) {
  const [state, action] = useActionState(adjustInventoryAction, initialFormState);
  const errors = state.fieldErrors;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-medium tracking-[-0.02em]">Inventory</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Every change records a movement with its reason and author.
          </p>
        </div>
        <p className="font-display text-3xl font-medium tracking-[-0.02em]">
          {stock}
          <span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground">
            {stock === 1 ? "unit on hand" : "units on hand"}
          </span>
        </p>
      </div>

      {canAdjust ? (
        <form action={action} className="space-y-4 border-t border-border pt-5">
          <input type="hidden" name="productId" value={productId} />
          <FormMessage state={state} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Change" htmlFor="inventory-mode" error={errors?.mode}>
              <Select id="inventory-mode" name="mode" defaultValue="add">
                <option value="add">Add units</option>
                <option value="set">Set exact count</option>
              </Select>
            </Field>

            <Field label="Quantity" htmlFor="inventory-quantity" error={errors?.quantity}>
              <Input
                id="inventory-quantity"
                name="quantity"
                type="number"
                min={0}
                max={100000}
                step={1}
                required
                defaultValue={0}
                aria-invalid={errors?.quantity ? true : undefined}
                aria-describedby={errors?.quantity ? "inventory-quantity-error" : undefined}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Reason" htmlFor="inventory-reason" error={errors?.reason}>
              <Select id="inventory-reason" name="reason" defaultValue="RESTOCK">
                <option value="RESTOCK">Restock</option>
                <option value="CORRECTION">Correction</option>
                <option value="RETURN">Return</option>
              </Select>
            </Field>

            <Field label="Note" htmlFor="inventory-note" hint="Optional" error={errors?.note}>
              <Input
                id="inventory-note"
                name="note"
                maxLength={200}
                placeholder="Firing batch 14"
                aria-invalid={errors?.note ? true : undefined}
                aria-describedby={errors?.note ? "inventory-note-error" : undefined}
              />
            </Field>
          </div>

          <SubmitButton pendingLabel="Recording…" variant="secondary" className="w-auto" size="sm">
            Record movement
          </SubmitButton>
        </form>
      ) : (
        <p className="border-t border-border pt-5 text-sm text-muted-foreground">
          Archived objects cannot change stock.
        </p>
      )}

      <div className="border-t border-border pt-5">
        <h3 className="eyebrow text-muted-foreground">Movement history</h3>

        {movements.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No movements recorded yet.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {movements.map((movement) => (
              <li
                key={movement.id}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-border/60 pb-3 text-sm last:border-b-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {movement.delta > 0 ? `+${movement.delta}` : movement.delta}{" "}
                    <span className="font-normal text-muted-foreground">
                      {reasonLabels[movement.reason] ?? movement.reason}
                      {movement.note ? ` · ${movement.note}` : ""}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {movement.actorName ?? "SupplyHub"}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Ends at {movement.resultingStock}</p>
                  <p className="mt-0.5">{timestampFormatter.format(movement.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
