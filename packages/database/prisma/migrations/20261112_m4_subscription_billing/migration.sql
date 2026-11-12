-- Migration: 20261112_m4_subscription_billing
-- Adds SubscriptionPlan, Invoices, UsageRecords, CreditNotes, and extends Subscription and Payment models

-- 1. Extend SubStatus enum if needed
ALTER TYPE "SubStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "SubStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- 2. Create subscription_plans table
CREATE TABLE IF NOT EXISTS "subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "monthly_price_paise" INTEGER NOT NULL DEFAULT 0,
    "annual_price_paise" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "prompt_runs_limit" INTEGER NOT NULL DEFAULT 100,
    "brand_limit" INTEGER NOT NULL DEFAULT 1,
    "workspace_limit" INTEGER NOT NULL DEFAULT 1,
    "competitor_limit" INTEGER NOT NULL DEFAULT 3,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "trial_days" INTEGER NOT NULL DEFAULT 14,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- 3. Extend subscriptions table
ALTER TABLE "subscriptions" 
    ADD COLUMN IF NOT EXISTS "plan_id" UUID,
    ADD COLUMN IF NOT EXISTS "canceled_at" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "effective_cancellation_date" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "subscriptions_plan_id_idx" ON "subscriptions"("plan_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_plan_id_fkey'
    ) THEN
        ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" 
            FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Extend usage_counters table
ALTER TABLE "usage_counters" 
    ADD COLUMN IF NOT EXISTS "prompt_runs_reserved" INTEGER NOT NULL DEFAULT 0;

-- 5. Create invoices table
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "subscription_id" UUID,
    "invoice_number" VARCHAR(100) NOT NULL,
    "billing_period_start" TIMESTAMPTZ NOT NULL,
    "billing_period_end" TIMESTAMPTZ NOT NULL,
    "subtotal_paise" BIGINT NOT NULL,
    "tax_paise" BIGINT NOT NULL DEFAULT 0,
    "total_paise" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(50) NOT NULL DEFAULT 'PAID',
    "customer_name" VARCHAR(255),
    "customer_email" VARCHAR(255),
    "customer_address" TEXT,
    "customer_gstin" VARCHAR(50),
    "tax_rate_percent" DECIMAL(5, 2) NOT NULL DEFAULT 18.0,
    "pdf_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX IF NOT EXISTS "invoices_organization_id_created_at_idx" ON "invoices"("organization_id", "created_at" DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoices_organization_id_fkey'
    ) THEN
        ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" 
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'invoices_subscription_id_fkey'
    ) THEN
        ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" 
            FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 6. Extend payments table
ALTER TABLE "payments" 
    ADD COLUMN IF NOT EXISTS "organization_id" UUID,
    ADD COLUMN IF NOT EXISTS "invoice_id" UUID,
    ADD COLUMN IF NOT EXISTS "provider" VARCHAR(50) NOT NULL DEFAULT 'mock',
    ADD COLUMN IF NOT EXISTS "provider_payment_id" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(255),
    ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;

ALTER TABLE "payments" ALTER COLUMN "razorpay_payment_id" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "payments_idempotency_key_key" ON "payments"("idempotency_key");
CREATE INDEX IF NOT EXISTS "payments_organization_id_idx" ON "payments"("organization_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_invoice_id_fkey'
    ) THEN
        ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" 
            FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 7. Create usage_records table
CREATE TABLE IF NOT EXISTS "usage_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "usage_type" VARCHAR(50) NOT NULL DEFAULT 'PROMPT_RUN',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "prompt_run_id" UUID,
    "tracking_run_id" UUID,
    "idempotency_key" VARCHAR(255),
    "period_start" TIMESTAMPTZ NOT NULL,
    "period_end" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "usage_records_idempotency_key_key" ON "usage_records"("idempotency_key");
CREATE INDEX IF NOT EXISTS "usage_records_organization_id_period_start_idx" ON "usage_records"("organization_id", "period_start");
CREATE INDEX IF NOT EXISTS "usage_records_tracking_run_id_idx" ON "usage_records"("tracking_run_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usage_records_organization_id_fkey'
    ) THEN
        ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organization_id_fkey" 
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 8. Create credit_notes table
CREATE TABLE IF NOT EXISTS "credit_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "credit_number" VARCHAR(100) NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ISSUED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "credit_notes_credit_number_key" ON "credit_notes"("credit_number");
CREATE INDEX IF NOT EXISTS "credit_notes_organization_id_idx" ON "credit_notes"("organization_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'credit_notes_organization_id_fkey'
    ) THEN
        ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_organization_id_fkey" 
            FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'credit_notes_invoice_id_fkey'
    ) THEN
        ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_fkey" 
            FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

