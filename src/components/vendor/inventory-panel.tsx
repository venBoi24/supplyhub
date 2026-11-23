"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { adjustInventoryAction } from "@/features/catalog/vendor-actions";
import { useT } from "@/i18n/client";
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

const REASON_LABEL_KEYS: Record<string, string> = {
  INITIAL: "studio.reasonInitial",
  RESTOCK: "studio.reasonRestock",
  CORRECTION: "studio.reasonCorrection",
  RETURN: "studio.reasonReturn",
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
  adminVendorId,
}: {
  productId: string;
  stock: number;
  movements: StudioMovement[];
  canAdjust: boolean;
  adminVendorId?: string;
}) {
  const t = useT();
  const [state, action] = useActionState(adjustInventoryAction, initialFormState);
  const errors = state.fieldErrors;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
            {t("studio.inventory")}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t("studio.inventoryNote")}
          </p>
        </div>
        <p className="font-display text-3xl font-medium tracking-[-0.02em]">
          {stock}
          <span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground">
            {t("studio.onHand", {
              units: stock === 1 ? t("common.piece") : t("common.pieces"),
            })}
          </span>
        </p>
      </div>

      {canAdjust ? (
        <form action={action} className="space-y-4 border-t border-border pt-5">
          <input type="hidden" name="productId" value={productId} />
          {adminVendorId ? (
            <input type="hidden" name="adminVendorId" value={adminVendorId} />
          ) : null}
          <FormMessage state={state} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("studio.change")} htmlFor="inventory-mode" error={errors?.mode}>
              <Select id="inventory-mode" name="mode" defaultValue="add">
                <option value="add">{t("studio.addUnits")}</option>
                <option value="set">{t("studio.setExactCount")}</option>
              </Select>
            </Field>

            <Field
              label={t("common.quantity")}
              htmlFor="inventory-quantity"
              error={errors?.quantity}
            >
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
            <Field
              label={t("experience.protection.reason")}
              htmlFor="inventory-reason"
              error={errors?.reason}
            >
              <Select id="inventory-reason" name="reason" defaultValue="RESTOCK">
                <option value="RESTOCK">{t("studio.reasonRestock")}</option>
                <option value="CORRECTION">{t("studio.reasonCorrection")}</option>
                <option value="RETURN">{t("studio.reasonReturn")}</option>
              </Select>
            </Field>

            <Field
              label={t("studio.note")}
              htmlFor="inventory-note"
              hint={t("common.optional")}
              error={errors?.note}
            >
              <Input
                id="inventory-note"
                name="note"
                maxLength={200}
                placeholder={t("studio.notePlaceholder")}
                aria-invalid={errors?.note ? true : undefined}
                aria-describedby={errors?.note ? "inventory-note-error" : undefined}
              />
            </Field>
          </div>

          <SubmitButton
            pendingLabel={t("studio.recordingPending")}
            variant="secondary"
            className="w-auto"
            size="sm"
          >
            {t("studio.recordMovement")}
          </SubmitButton>
        </form>
      ) : (
        <p className="border-t border-border pt-5 text-sm text-muted-foreground">
          {t("studio.archivedNoStock")}
        </p>
      )}

      <div className="border-t border-border pt-5">
        <h3 className="eyebrow text-muted-foreground">{t("studio.movementHistory")}</h3>

        {movements.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("studio.noMovements")}</p>
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
                      {(() => {
                        const reasonKey = REASON_LABEL_KEYS[movement.reason];
                        return reasonKey ? t(reasonKey) : movement.reason;
                      })()}
                      {movement.note ? ` · ${movement.note}` : ""}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {movement.actorName ?? "SupplyHub"}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{t("studio.endsAt", { count: movement.resultingStock })}</p>
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
