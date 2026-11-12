-- Migration: 20261112_m5_ad_intelligence
-- Module M5 Competitor Ad Intelligence Tables & Enums

-- 1. Extend AdPlatform enum
ALTER TYPE "AdPlatform" ADD VALUE IF NOT EXISTS 'TIKTOK_ADS';
ALTER TYPE "AdPlatform" ADD VALUE IF NOT EXISTS 'MANUAL';
ALTER TYPE "AdPlatform" ADD VALUE IF NOT EXISTS 'OTHER';

-- 2. Create M5 Enums
DO $$ BEGIN
    CREATE TYPE "AdSourceType" AS ENUM ('META_AD_LIBRARY', 'GOOGLE_ADS_TRANSPARENCY', 'TIKTOK_CREATIVE_CENTER', 'MANUAL_SUBMISSION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AdFormat" AS ENUM ('IMAGE', 'VIDEO', 'CAROUSEL', 'TEXT', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AdStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNKNOWN', 'REMOVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create ad_sources table
CREATE TABLE IF NOT EXISTS "ad_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "source_type" "AdSourceType" NOT NULL,
    "is_supported" BOOLEAN NOT NULL DEFAULT true,
    "api_endpoint" TEXT,
    "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 60,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_sources_pkey" PRIMARY KEY ("id")
);

-- 4. Create ad_records table
CREATE TABLE IF NOT EXISTS "ad_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "competitor_id" UUID,
    "brand_id" UUID,
    "ad_source_id" UUID,
    "platform" "AdPlatform" NOT NULL DEFAULT 'META_ADS',
    "external_ad_id" VARCHAR(255) NOT NULL,
    "original_url" TEXT,
    "advertiser_name" VARCHAR(255) NOT NULL,
    "advertiser_external_id" VARCHAR(255),
    "headline" TEXT,
    "primary_text" TEXT,
    "description" TEXT,
    "cta_text" VARCHAR(100),
    "format" "AdFormat" NOT NULL DEFAULT 'UNKNOWN',
    "landing_page_url" TEXT,
    "country" VARCHAR(10) DEFAULT 'IN',
    "language" VARCHAR(10) DEFAULT 'en',
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content_hash" VARCHAR(64) NOT NULL,
    "status" "AdStatus" NOT NULL DEFAULT 'ACTIVE',
    "raw_metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_records_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_org_platform_ext_ad" UNIQUE ("organization_id", "platform", "external_ad_id"),
    CONSTRAINT "ad_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "ad_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
    CONSTRAINT "ad_records_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE SET NULL,
    CONSTRAINT "ad_records_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL,
    CONSTRAINT "ad_records_ad_source_id_fkey" FOREIGN KEY ("ad_source_id") REFERENCES "ad_sources"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ad_records_organization_id_platform_idx" ON "ad_records"("organization_id", "platform");
CREATE INDEX IF NOT EXISTS "ad_records_competitor_id_idx" ON "ad_records"("competitor_id");
CREATE INDEX IF NOT EXISTS "ad_records_project_id_idx" ON "ad_records"("project_id");
CREATE INDEX IF NOT EXISTS "ad_records_content_hash_idx" ON "ad_records"("content_hash");
CREATE INDEX IF NOT EXISTS "ad_records_first_seen_at_idx" ON "ad_records"("first_seen_at");

-- 5. Create ad_creatives table
CREATE TABLE IF NOT EXISTS "ad_creatives" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ad_record_id" UUID NOT NULL,
    "media_type" "AdFormat" NOT NULL DEFAULT 'IMAGE',
    "media_url" TEXT,
    "thumbnail_url" TEXT,
    "caption" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "checksum" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ad_creatives_ad_record_id_fkey" FOREIGN KEY ("ad_record_id") REFERENCES "ad_records"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ad_creatives_ad_record_id_idx" ON "ad_creatives"("ad_record_id");

-- 6. Create ad_landing_pages table
CREATE TABLE IF NOT EXISTS "ad_landing_pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ad_record_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "normalized_domain" VARCHAR(255) NOT NULL,
    "page_title" TEXT,
    "meta_description" TEXT,
    "status_code" INTEGER,
    "is_accessible" BOOLEAN NOT NULL DEFAULT true,
    "extracted_offers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_landing_pages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ad_landing_pages_ad_record_id_fkey" FOREIGN KEY ("ad_record_id") REFERENCES "ad_records"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ad_landing_pages_ad_record_id_idx" ON "ad_landing_pages"("ad_record_id");
CREATE INDEX IF NOT EXISTS "ad_landing_pages_normalized_domain_idx" ON "ad_landing_pages"("normalized_domain");

-- 7. Create ad_snapshots table
CREATE TABLE IF NOT EXISTS "ad_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ad_record_id" UUID NOT NULL,
    "content_hash" VARCHAR(64) NOT NULL,
    "snapshot_data" JSONB NOT NULL,
    "observed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_snapshots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ad_snapshots_ad_record_id_fkey" FOREIGN KEY ("ad_record_id") REFERENCES "ad_records"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ad_snapshots_ad_record_id_observed_at_idx" ON "ad_snapshots"("ad_record_id", "observed_at" DESC);

-- 8. Create ad_analyses table
CREATE TABLE IF NOT EXISTS "ad_analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ad_record_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "main_message" TEXT NOT NULL,
    "value_proposition" TEXT NOT NULL,
    "pain_points" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audience_signals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emotional_vs_rational" VARCHAR(20) NOT NULL DEFAULT 'BALANCED',
    "positioning" TEXT NOT NULL,
    "promotional_strategy" TEXT NOT NULL,
    "offer_strategy" TEXT NOT NULL,
    "cta_strategy" TEXT NOT NULL,
    "creative_format" VARCHAR(50) NOT NULL,
    "messaging_angle" TEXT NOT NULL,
    "landing_page_relevance" TEXT,
    "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "model" VARCHAR(100) NOT NULL DEFAULT 'gemini-3.8-flash',
    "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
    "completion_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_paise" INTEGER NOT NULL DEFAULT 0,
    "raw_ai_output" JSONB NOT NULL DEFAULT '{}',
    "analysis_version" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_analyses_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ad_analyses_ad_record_id_fkey" FOREIGN KEY ("ad_record_id") REFERENCES "ad_records"("id") ON DELETE CASCADE,
    CONSTRAINT "ad_analyses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ad_analyses_ad_record_id_idx" ON "ad_analyses"("ad_record_id");
CREATE INDEX IF NOT EXISTS "ad_analyses_organization_id_idx" ON "ad_analyses"("organization_id");

-- 9. Create ad_monitoring_jobs table
CREATE TABLE IF NOT EXISTS "ad_monitoring_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "competitor_id" UUID NOT NULL,
    "check_frequency" VARCHAR(20) NOT NULL DEFAULT 'DAILY',
    "sources" TEXT[] DEFAULT ARRAY['META_AD_LIBRARY']::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMPTZ,
    "next_run_at" TIMESTAMPTZ,
    "last_status" VARCHAR(50) DEFAULT 'PENDING',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_monitoring_jobs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "uq_org_competitor_monitoring" UNIQUE ("organization_id", "competitor_id"),
    CONSTRAINT "ad_monitoring_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "ad_monitoring_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
    CONSTRAINT "ad_monitoring_jobs_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ad_monitoring_jobs_organization_id_is_active_idx" ON "ad_monitoring_jobs"("organization_id", "is_active");
CREATE INDEX IF NOT EXISTS "ad_monitoring_jobs_competitor_id_idx" ON "ad_monitoring_jobs"("competitor_id");

-- 10. Create ad_change_events table
CREATE TABLE IF NOT EXISTS "ad_change_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "ad_record_id" UUID NOT NULL,
    "competitor_id" UUID,
    "change_type" VARCHAR(50) NOT NULL,
    "field_changed" VARCHAR(100),
    "previous_value" TEXT,
    "new_value" TEXT,
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_change_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ad_change_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "ad_change_events_ad_record_id_fkey" FOREIGN KEY ("ad_record_id") REFERENCES "ad_records"("id") ON DELETE CASCADE,
    CONSTRAINT "ad_change_events_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ad_change_events_organization_id_detected_at_idx" ON "ad_change_events"("organization_id", "detected_at" DESC);
CREATE INDEX IF NOT EXISTS "ad_change_events_ad_record_id_idx" ON "ad_change_events"("ad_record_id");

-- 11. Create ad_comparisons table
CREATE TABLE IF NOT EXISTS "ad_comparisons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "ad_record_ids" TEXT[] NOT NULL,
    "ai_summary" TEXT,
    "common_themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "differing_themes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_comparisons_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ad_comparisons_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ad_comparisons_organization_id_created_at_idx" ON "ad_comparisons"("organization_id", "created_at" DESC);

-- 12. Create ad_recommendations table
CREATE TABLE IF NOT EXISTS "ad_recommendations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "brand_id" UUID,
    "competitor_id" UUID,
    "category" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "explanation" TEXT NOT NULL,
    "supporting_ad_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_references" JSONB NOT NULL DEFAULT '[]',
    "evidence_summary" TEXT NOT NULL,
    "expected_benefit" TEXT NOT NULL,
    "confidence" VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    "suggested_action" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ad_recommendations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ad_recommendations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "ad_recommendations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
    CONSTRAINT "ad_recommendations_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL,
    CONSTRAINT "ad_recommendations_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ad_recommendations_organization_id_status_idx" ON "ad_recommendations"("organization_id", "status");
CREATE INDEX IF NOT EXISTS "ad_recommendations_project_id_idx" ON "ad_recommendations"("project_id");

-- 13. Create ad_collection_runs table
CREATE TABLE IF NOT EXISTS "ad_collection_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "competitor_id" UUID,
    "source" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'RUNNING',
    "ads_discovered" INTEGER NOT NULL DEFAULT 0,
    "ads_processed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    CONSTRAINT "ad_collection_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ad_collection_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "ad_collection_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
    CONSTRAINT "ad_collection_runs_competitor_id_fkey" FOREIGN KEY ("competitor_id") REFERENCES "competitors"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "ad_collection_runs_organization_id_started_at_idx" ON "ad_collection_runs"("organization_id", "started_at" DESC);

