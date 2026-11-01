"use client";

import { CreditCard, Lock, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { formatMoney } from "@/features/catalog/money";
import { refreshPaymentAction, startPaymentAction } from "@/features/payments/actions";
import { PAYMENT_METHOD_OPTIONS } from "@/features/payments/methods";
import { initialPaymentActionState, type PaymentActionState } from "@/features/payments/state";
import type { CustomerPaymentView } from "@/features/payments/queries";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format-date";

const POLL_INTERVAL_MS = 4_000;
const MAX_POLLS = 30;

export interface PaymentPanelProps {
  orderNumber: string;
  totalCents: number;
  currency: string;
  latestPayment: CustomerPaymentView | null;
  canPay: boolean;
  defaultPhone: string | null;
  reservationExpiresAt: Date | null;
  paymentReturned: boolean;
}

export function PaymentPanel({
  orderNumber,
  totalCents,
  currency,
  latestPayment,
  canPay,
  defaultPhone,
  reservationExpiresAt,
  paymentReturned,
}: PaymentPanelProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(startPaymentAction, initialPaymentActionState);
  const [method, setMethod] = useState<"mpesa" | "tigopesa" | "airtel" | "halopesa" | "card">(
    "mpesa",
  );
  const [pollState, setPollState] = useState<PaymentActionState | null>(null);
  const pollCount = useRef(0);
  const isCard = method === "card";
  const errors = state.fieldErrors ?? {};

  const awaitingProvider =
    state.status === "processing" ||
    latestPayment?.status === "PROCESSING" ||
    (latestPayment?.status === "PENDING" && latestPayment.hasProviderPaymentId) ||
    paymentReturned;

  useEffect(() => {
    if (state.status === "redirect" && state.checkoutUrl) {
      window.location.assign(state.checkoutUrl);
    }
  }, [state]);

  useEffect(() => {
    if (!awaitingProvider) {
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    pollCount.current = 0;

    async function poll() {
      if (cancelled) {
        return;
      }

      pollCount.current += 1;
      const result = await refreshPaymentAction(orderNumber);

      if (cancelled) {
        return;
      }

      setPollState(result);

      if (result.status === "paid") {
        router.refresh();
        return;
      }

      if (result.status === "error" || pollCount.current >= MAX_POLLS) {
        return;
      }

      timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    }

    timer = window.setTimeout(poll, paymentReturned ? 500 : POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [awaitingProvider, orderNumber, paymentReturned, router]);

  const notice = pollState ?? state;
  const showForm = canPay && state.status !== "paid" && state.status !== "redirect";
  const cardCheckout =
    latestPayment?.checkoutUrl &&
    (latestPayment.method === "card" || method === "card") &&
    latestPayment.status === "PROCESSING";

  return (
    <section
      aria-labelledby="payment-heading"
      className="overflow-hidden rounded-xl border border-border bg-surface"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-5 sm:px-8">
        <div>
          <p className="eyebrow text-muted-foreground">Payment</p>
          <h2
            id="payment-heading"
            className="mt-2 font-display text-2xl font-medium tracking-[-0.03em]"
          >
            Settle this order
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reservationExpiresAt
              ? `Stock is reserved until ${formatDateTime(reservationExpiresAt)}.`
              : "Pay securely through LynxPay."}
          </p>
        </div>
        <p className="font-display text-3xl font-medium tracking-[-0.02em] tabular-nums">
          {formatMoney(totalCents, currency)}
        </p>
      </div>

      <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-5">
          {showForm ? (
            <form action={formAction} className="space-y-5">
              <input type="hidden" name="orderNumber" value={orderNumber} />

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">How would you like to pay?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PAYMENT_METHOD_OPTIONS.map((option) => {
                    const selected = method === option.value;
                    const Icon = option.value === "card" ? CreditCard : Smartphone;

                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
                          selected
                            ? "border-accent bg-accent-soft"
                            : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted",
                        )}
                      >
                        <input
                          type="radio"
                          name="method"
                          value={option.value}
                          checked={selected}
                          onChange={() => setMethod(option.value)}
                          className="sr-only"
                        />
                        <Icon
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            selected ? "text-accent" : "text-muted-foreground",
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground">{option.label}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {isCard ? (
                <Notice tone="info">
                  You will leave SupplyHub for LynxPay&apos;s secure card page. SupplyHub never sees
                  your card details.
                </Notice>
              ) : (
                <Field
                  label="Mobile money number"
                  htmlFor="payment-phone"
                  hint="Tanzania"
                  error={errors.phone}
                >
                  <Input
                    id="payment-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="0754 123 456"
                    defaultValue={defaultPhone ?? ""}
                    aria-invalid={errors.phone ? true : undefined}
                    aria-describedby={errors.phone ? "payment-phone-error" : undefined}
                  />
                </Field>
              )}

              {state.status === "error" && state.message ? (
                <Notice tone="danger">{state.message}</Notice>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <SubmitButton
                  pendingLabel="Contacting LynxPay…"
                  size="lg"
                  className="w-auto min-w-44"
                >
                  {isCard ? "Continue to card page" : "Send payment prompt"}
                </SubmitButton>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3.5" aria-hidden="true" />
                  LynxPay&apos;s collection fee is added to your total.
                </p>
              </div>
            </form>
          ) : null}

          {notice.message ? (
            <Notice
              tone={
                notice.status === "paid" ? "success" : notice.status === "error" ? "danger" : "info"
              }
            >
              {notice.message}
            </Notice>
          ) : null}

          {!showForm && latestPayment?.status === "SUCCEEDED" ? (
            <p className="text-sm leading-6 text-muted-foreground">
              This payment is complete. The order and its studios have been marked paid.
            </p>
          ) : null}

          {!canPay && latestPayment?.status !== "SUCCEEDED" ? (
            <Notice tone="warning">
              Payment cannot be started for this order. Its reservation may have expired, or the
              order is no longer awaiting payment.
            </Notice>
          ) : null}
        </div>

        <aside className="space-y-4 rounded-lg border border-border bg-surface-muted/60 p-4">
          <p className="eyebrow text-muted-foreground">LynxPay</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Mobile money prompts are approved with your PIN. Card payments use LynxPay&apos;s secure
            hosted page.
          </p>
          <dl className="space-y-2 border-t border-border pt-3 text-xs">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Merchant total</dt>
              <dd className="tabular-nums">{formatMoney(totalCents, currency)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Confirmed by</dt>
              <dd>Verified LynxPay event</dd>
            </div>
          </dl>
          {cardCheckout && latestPayment?.checkoutUrl ? (
            <a
              href={latestPayment.checkoutUrl}
              className="inline-flex text-sm font-medium text-accent underline underline-offset-4"
            >
              Continue card payment
            </a>
          ) : null}
          <p className="text-[0.6875rem] leading-5 text-muted-foreground">
            SupplyHub marks an order paid only after LynxPay confirms the exact amount. Returning
            from the card page is not enough.
          </p>
        </aside>
      </div>
    </section>
  );
}
