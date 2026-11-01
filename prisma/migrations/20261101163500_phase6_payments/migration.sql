-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('LYNXPAY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentEventOutcome" AS ENUM ('APPLIED', 'DUPLICATE', 'IGNORED', 'MISMATCH', 'UNKNOWN_ORDER', 'ERROR');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "CommissionEntryType" AS ENUM ('VENDOR_EARNING', 'PLATFORM_COMMISSION', 'PROVIDER_FEE');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'RECONCILED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_INITIATED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_SUCCEEDED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_MISMATCH';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_REFUNDED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYOUT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYOUT_PAID';
ALTER TYPE "AuditAction" ADD VALUE 'PAYOUT_RECONCILED';

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'LYNXPAY',
    "attempt" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "fee_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL,
    "payment_method" VARCHAR(32),
    "customer_phone" VARCHAR(20),
    "idempotency_key" VARCHAR(128) NOT NULL,
    "provider_payment_id" VARCHAR(128),
    "provider_reference" VARCHAR(128),
    "checkout_url" TEXT,
    "failure_code" VARCHAR(64),
    "failure_message" TEXT,
    "initiated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'LYNXPAY',
    "delivery_id" VARCHAR(128) NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "provider_payment_id" VARCHAR(128),
    "external_id" VARCHAR(128),
    "status" "PaymentStatus",
    "outcome" "PaymentEventOutcome" NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "reason" VARCHAR(200) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "provider_refund_id" VARCHAR(128),
    "requested_by_id" UUID,
    "failure_message" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL,
    "version" VARCHAR(64) NOT NULL,
    "basis_points" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_ledger" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "refund_id" UUID,
    "order_id" UUID NOT NULL,
    "vendor_order_id" UUID,
    "vendor_id" UUID,
    "commission_rule_id" UUID,
    "type" "CommissionEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "basis_points" INTEGER,
    "entry_key" VARCHAR(160) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "reference" VARCHAR(64),
    "note" TEXT,
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "created_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "paid_at" TIMESTAMPTZ(6),
    "reconciled_at" TIMESTAMPTZ(6),
    "failure_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE INDEX "payments_order_id_status_idx" ON "payments"("order_id", "status");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_attempt_key" ON "payments"("order_id", "attempt");

-- CreateIndex
CREATE INDEX "payment_events_provider_payment_id_idx" ON "payment_events"("provider_payment_id");

-- CreateIndex
CREATE INDEX "payment_events_outcome_received_at_idx" ON "payment_events"("outcome", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_delivery_id_key" ON "payment_events"("provider", "delivery_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_refund_id_key" ON "refunds"("provider_refund_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_status_idx" ON "refunds"("payment_id", "status");

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "commission_rules_version_key" ON "commission_rules"("version");

-- CreateIndex
CREATE UNIQUE INDEX "commission_ledger_entry_key_key" ON "commission_ledger"("entry_key");

-- CreateIndex
CREATE INDEX "commission_ledger_order_id_idx" ON "commission_ledger"("order_id");

-- CreateIndex
CREATE INDEX "commission_ledger_payment_id_idx" ON "commission_ledger"("payment_id");

-- CreateIndex
CREATE INDEX "commission_ledger_vendor_id_created_at_idx" ON "commission_ledger"("vendor_id", "created_at");

-- CreateIndex
CREATE INDEX "commission_ledger_type_created_at_idx" ON "commission_ledger"("type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_reference_key" ON "payouts"("reference");

-- CreateIndex
CREATE INDEX "payouts_vendor_id_status_idx" ON "payouts"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "payouts_status_created_at_idx" ON "payouts"("status", "created_at");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_vendor_order_id_fkey" FOREIGN KEY ("vendor_order_id") REFERENCES "vendor_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_commission_rule_id_fkey" FOREIGN KEY ("commission_rule_id") REFERENCES "commission_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

