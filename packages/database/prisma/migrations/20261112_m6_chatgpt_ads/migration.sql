-- Migration: 20261112_m6_chatgpt_ads
-- Module M6 ChatGPT Ads Intelligence & Advertiser Integration

-- 1. Create chatgpt_ads_accounts table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "openai_account_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "status" VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
    "review_status" VARCHAR(50),
    "last_sync_at" TIMESTAMPTZ,
    "last_successful_sync_at" TIMESTAMPTZ,
    "sync_error" TEXT,
    "data_freshness_info" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_accounts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_org_openai_account" UNIQUE ("organization_id", "openai_account_id"),
    CONSTRAINT "chatgpt_ads_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_accounts_organization_id_status_idx" ON "chatgpt_ads_accounts"("organization_id", "status");

-- 2. Create chatgpt_ads_credentials table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "encrypted_key" TEXT NOT NULL,
    "iv" VARCHAR(64) NOT NULL,
    "auth_tag" VARCHAR(64) NOT NULL,
    "key_prefix" VARCHAR(32) NOT NULL,
    "last_four" VARCHAR(8) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "rotated_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_credentials_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chatgpt_ads_credentials_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chatgpt_ads_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_credentials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_credentials_organization_id_status_idx" ON "chatgpt_ads_credentials"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "chatgpt_ads_credentials_account_id_idx" ON "chatgpt_ads_credentials"("account_id");

-- 3. Create chatgpt_ads_campaigns table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "openai_campaign_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "objective" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PAUSED',
    "delivery_status" VARCHAR(50),
    "budget_amount_paise" BIGINT NOT NULL DEFAULT 0,
    "budget_type" VARCHAR(50) NOT NULL DEFAULT 'DAILY',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "start_time" TIMESTAMPTZ,
    "end_time" TIMESTAMPTZ,
    "targeting_config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_campaigns_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_org_openai_campaign" UNIQUE ("organization_id", "openai_campaign_id"),
    CONSTRAINT "chatgpt_ads_campaigns_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chatgpt_ads_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_campaigns_account_id_status_idx" ON "chatgpt_ads_campaigns"("account_id", "status");
CREATE INDEX IF NOT EXISTS "chatgpt_ads_campaigns_organization_id_idx" ON "chatgpt_ads_campaigns"("organization_id");

-- 4. Create chatgpt_ads_ad_groups table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_ad_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "openai_ad_group_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PAUSED',
    "bid_amount_paise" BIGINT,
    "bid_strategy" VARCHAR(50) NOT NULL DEFAULT 'MAXIMIZE_CLICKS',
    "context_hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audience_config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_ad_groups_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_org_openai_ad_group" UNIQUE ("organization_id", "openai_ad_group_id"),
    CONSTRAINT "chatgpt_ads_ad_groups_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "chatgpt_ads_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_ad_groups_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chatgpt_ads_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_ad_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_ad_groups_campaign_id_idx" ON "chatgpt_ads_ad_groups"("campaign_id");
CREATE INDEX IF NOT EXISTS "chatgpt_ads_ad_groups_account_id_idx" ON "chatgpt_ads_ad_groups"("account_id");

-- 5. Create chatgpt_ads_assets table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "openai_asset_id" VARCHAR(255) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_assets_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_org_openai_asset" UNIQUE ("organization_id", "openai_asset_id"),
    CONSTRAINT "chatgpt_ads_assets_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chatgpt_ads_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_assets_account_id_idx" ON "chatgpt_ads_assets"("account_id");

-- 6. Create chatgpt_ads_ads table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_ads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ad_group_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "openai_ad_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "headline" TEXT NOT NULL,
    "ad_copy" TEXT NOT NULL,
    "advertiser_name" VARCHAR(255) NOT NULL,
    "destination_url" TEXT NOT NULL,
    "landing_page_url" TEXT NOT NULL,
    "image_url" TEXT,
    "asset_id" UUID,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PAUSED',
    "review_status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "serving_issues" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_ads_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_org_openai_ad" UNIQUE ("organization_id", "openai_ad_id"),
    CONSTRAINT "chatgpt_ads_ads_ad_group_id_fkey" FOREIGN KEY ("ad_group_id") REFERENCES "chatgpt_ads_ad_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_ads_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chatgpt_ads_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_ads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_ads_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "chatgpt_ads_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_ads_ad_group_id_idx" ON "chatgpt_ads_ads"("ad_group_id");
CREATE INDEX IF NOT EXISTS "chatgpt_ads_ads_account_id_idx" ON "chatgpt_ads_ads"("account_id");

-- 7. Create chatgpt_ads_insights table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_insights" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "campaign_id" UUID,
    "ad_group_id" UUID,
    "ad_id" UUID,
    "date" DATE NOT NULL,
    "impressions" INTEGER,
    "clicks" INTEGER,
    "ctr" DOUBLE PRECISION,
    "spend_paise" BIGINT,
    "cpc_paise" BIGINT,
    "cpm_paise" BIGINT,
    "conversions" INTEGER,
    "cpa_paise" BIGINT,
    "attributed_sales_paise" BIGINT,
    "roas" DOUBLE PRECISION,
    "breakdown_country" VARCHAR(10),
    "breakdown_device" VARCHAR(50),
    "breakdown_platform" VARCHAR(50),
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "fetched_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_insights_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chatgpt_ads_insights_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_insights_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chatgpt_ads_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_insights_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "chatgpt_ads_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_insights_ad_group_id_fkey" FOREIGN KEY ("ad_group_id") REFERENCES "chatgpt_ads_ad_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_insights_ad_id_fkey" FOREIGN KEY ("ad_id") REFERENCES "chatgpt_ads_ads"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_insights_org_acc_date_idx" ON "chatgpt_ads_insights"("organization_id", "account_id", "date" DESC);
CREATE INDEX IF NOT EXISTS "chatgpt_ads_insights_campaign_date_idx" ON "chatgpt_ads_insights"("campaign_id", "date" DESC);

-- 8. Create chatgpt_ads_conversions table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_conversions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "pixel_id" VARCHAR(255) NOT NULL,
    "pixel_code" TEXT NOT NULL,
    "pixel_status" VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "conversions_api_enabled" BOOLEAN NOT NULL DEFAULT false,
    "supported_events" TEXT[] DEFAULT ARRAY['PAGE_VIEW', 'SIGN_UP', 'PURCHASE', 'LEAD']::TEXT[],
    "attribution_window_days" INTEGER NOT NULL DEFAULT 7,
    "view_through_window_hours" INTEGER NOT NULL DEFAULT 24,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_conversions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_org_chatgpt_conversion" UNIQUE ("organization_id", "account_id"),
    CONSTRAINT "chatgpt_ads_conversions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_conversions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chatgpt_ads_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 9. Create chatgpt_ads_events table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "conversion_config_id" UUID NOT NULL,
    "event_name" VARCHAR(100) NOT NULL,
    "event_id" VARCHAR(255) NOT NULL,
    "deduplication_id" VARCHAR(255) NOT NULL,
    "event_timestamp" TIMESTAMPTZ NOT NULL,
    "event_source" VARCHAR(50) NOT NULL DEFAULT 'SERVER',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "value_paise" BIGINT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'SENT',
    "api_response_code" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chatgpt_ads_events_deduplication_id_key" UNIQUE ("deduplication_id"),
    CONSTRAINT "chatgpt_ads_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_events_conversion_config_id_fkey" FOREIGN KEY ("conversion_config_id") REFERENCES "chatgpt_ads_conversions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_events_org_name_time_idx" ON "chatgpt_ads_events"("organization_id", "event_name", "event_timestamp" DESC);

-- 10. Create chatgpt_ads_sync_runs table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_sync_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "sync_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'RUNNING',
    "records_synced" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "chatgpt_ads_sync_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chatgpt_ads_sync_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_sync_runs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chatgpt_ads_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_sync_runs_org_acc_time_idx" ON "chatgpt_ads_sync_runs"("organization_id", "account_id", "started_at" DESC);

-- 11. Create chatgpt_ads_recommendations table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "campaign_id" UUID,
    "ad_group_id" UUID,
    "category" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "explanation" TEXT NOT NULL,
    "supporting_metrics" JSONB NOT NULL DEFAULT '{}',
    "source_data_period" VARCHAR(100) NOT NULL,
    "expected_direction" VARCHAR(100) NOT NULL,
    "confidence" VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    "potential_risks" TEXT NOT NULL,
    "suggested_action" TEXT NOT NULL,
    "action_payload" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "applied_at" TIMESTAMPTZ,
    "applied_by_user_id" UUID,
    "execution_result" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_recommendations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chatgpt_ads_recommendations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_recommendations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chatgpt_ads_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_recommendations_org_status_idx" ON "chatgpt_ads_recommendations"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "chatgpt_ads_recommendations_account_id_idx" ON "chatgpt_ads_recommendations"("account_id");

-- 12. Create chatgpt_ads_alerts table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "campaign_id" UUID,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'INFO',
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_alerts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chatgpt_ads_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_alerts_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chatgpt_ads_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_alerts_org_read_time_idx" ON "chatgpt_ads_alerts"("organization_id", "is_read", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "chatgpt_ads_alerts_account_id_idx" ON "chatgpt_ads_alerts"("account_id");

-- 13. Create chatgpt_ads_audit_logs table
CREATE TABLE IF NOT EXISTS "chatgpt_ads_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "target_id" VARCHAR(255) NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "financial_impact" TEXT,
    "user_confirmed" BOOLEAN NOT NULL DEFAULT true,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chatgpt_ads_audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chatgpt_ads_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chatgpt_ads_audit_logs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chatgpt_ads_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "chatgpt_ads_audit_logs_org_acc_time_idx" ON "chatgpt_ads_audit_logs"("organization_id", "account_id", "created_at" DESC);

