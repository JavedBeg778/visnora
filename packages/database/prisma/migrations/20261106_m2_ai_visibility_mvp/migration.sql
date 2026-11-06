-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BuyingStage" AS ENUM ('AWARENESS', 'CONSIDERATION', 'DECISION', 'GENERAL');

-- CreateEnum
CREATE TYPE "PromptCadence" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MANUAL');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MentionType" AS ENUM ('PRIMARY_BRAND', 'COMPETITOR', 'OTHER');

-- CreateEnum
CREATE TYPE "SentimentType" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED', 'UNKNOWN', 'NOT_EVALUATED');

-- CreateEnum
CREATE TYPE "AdPlatform" AS ENUM ('GOOGLE_ADS', 'META_ADS', 'OPENAI_ADS');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'PAUSED');

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "organization_members" DROP CONSTRAINT "organization_members_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_organization_id_fkey";

-- AlterTable
ALTER TABLE "invitations" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "role",
ADD COLUMN     "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
DROP COLUMN "status",
ADD COLUMN     "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "organization_members" ALTER COLUMN "id" DROP DEFAULT,
DROP COLUMN "role",
ADD COLUMN     "role" "OrgRole" NOT NULL DEFAULT 'ANALYST',
DROP COLUMN "status",
ADD COLUMN     "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workspaces" ALTER COLUMN "id" DROP DEFAULT;

-- DropEnum
DROP TYPE "invitation_status";

-- DropEnum
DROP TYPE "member_status";

-- DropEnum
DROP TYPE "org_role";

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "canonical_name" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "industry" VARCHAR(100),
    "country" VARCHAR(10) DEFAULT 'IN',
    "primary_language" VARCHAR(10) DEFAULT 'en',
    "additional_languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "products_services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brand_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_audience" TEXT,
    "brand_context" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitors" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "canonical_name" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "website" VARCHAR(255),
    "description" TEXT,
    "products_services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_groups" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracked_prompts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "group_id" UUID,
    "prompt_text" TEXT NOT NULL,
    "stage" "BuyingStage" NOT NULL DEFAULT 'CONSIDERATION',
    "category" VARCHAR(100) DEFAULT 'General Discovery',
    "topic_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_provider" VARCHAR(50) NOT NULL DEFAULT 'google-gemini',
    "target_model" VARCHAR(50) NOT NULL DEFAULT 'gemini-3.8-flash',
    "target_locale" VARCHAR(10) NOT NULL DEFAULT 'en-IN',
    "cadence" "PromptCadence" NOT NULL DEFAULT 'DAILY',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "last_run_at" TIMESTAMPTZ,
    "next_run_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracked_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    "provider" VARCHAR(50) NOT NULL DEFAULT 'google-gemini',
    "model" VARCHAR(100) NOT NULL DEFAULT 'gemini-3.8-flash',
    "prompt_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "total_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "total_output_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_paise" INTEGER NOT NULL DEFAULT 0,
    "actual_cost_paise" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_runs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "prompt_id" UUID NOT NULL,
    "tracking_run_id" UUID,
    "provider" VARCHAR(50) NOT NULL,
    "model_version" VARCHAR(100) NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "latency_ms" INTEGER,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "estimated_cost_paise" INTEGER NOT NULL DEFAULT 0,
    "actual_cost_paise" INTEGER NOT NULL DEFAULT 0,
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "executed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_responses" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "prompt_run_id" UUID NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "normalized_text" TEXT NOT NULL,
    "payload_hash" VARCHAR(64) NOT NULL,
    "has_citations" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response_mentions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ai_response_id" UUID NOT NULL,
    "matched_entity_id" UUID NOT NULL,
    "entity_name" VARCHAR(255) NOT NULL,
    "mention_type" "MentionType" NOT NULL,
    "char_start" INTEGER NOT NULL,
    "char_end" INTEGER NOT NULL,
    "evidence_text" TEXT NOT NULL,
    "list_position" INTEGER,
    "extraction_confidence" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    "sentiment" "SentimentType" NOT NULL DEFAULT 'NOT_EVALUATED',
    "sentiment_confidence" DECIMAL(3,2),
    "is_recommendation" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "response_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ai_response_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "citation_order" INTEGER NOT NULL DEFAULT 1,
    "anchor_text" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visibility_aggregates" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "aggregation_date" DATE NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "total_runs_evaluated" INTEGER NOT NULL,
    "brand_mentions_count" INTEGER NOT NULL,
    "observed_mention_rate" DECIMAL(5,2) NOT NULL,
    "sample_share_of_voice" DECIMAL(5,2) NOT NULL,
    "prompt_coverage" DECIMAL(5,2) NOT NULL,
    "visibility_score" DECIMAL(5,2),
    "citation_rate" DECIMAL(5,2),
    "positive_sentiment_rate" DECIMAL(5,2),
    "avg_mention_position" DECIMAL(4,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visibility_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "related_metric" VARCHAR(100) NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    "suggested_action" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_schedules" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "frequency" VARCHAR(50) NOT NULL DEFAULT 'DAILY',
    "provider" VARCHAR(50) NOT NULL DEFAULT 'google-gemini',
    "model" VARCHAR(100) NOT NULL DEFAULT 'gemini-3.8-flash',
    "group_id" UUID,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMPTZ,
    "next_run_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "tracking_run_id" UUID,
    "prompt_run_id" UUID,
    "provider" VARCHAR(50) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "estimated_cost_paise" INTEGER NOT NULL DEFAULT 0,
    "actual_cost_paise" INTEGER NOT NULL DEFAULT 0,
    "is_estimated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_connections" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "platform" "AdPlatform" NOT NULL,
    "account_id_external" VARCHAR(255) NOT NULL,
    "account_name" VARCHAR(255),
    "encrypted_credentials" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "auth_tag" BYTEA NOT NULL,
    "scopes" TEXT[],
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ,
    "last_synced_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_insights" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "ad_connection_id" UUID NOT NULL,
    "report_date" DATE NOT NULL,
    "campaign_external_id" VARCHAR(255) NOT NULL,
    "campaign_name" VARCHAR(255) NOT NULL,
    "impressions" BIGINT NOT NULL DEFAULT 0,
    "clicks" BIGINT NOT NULL DEFAULT 0,
    "spend_paise" BIGINT NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "conversions" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "conversion_value_paise" BIGINT NOT NULL DEFAULT 0,
    "data_class" VARCHAR(50) NOT NULL DEFAULT 'platform_reported',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public_ad_observations" (
    "id" UUID NOT NULL,
    "source_platform" VARCHAR(50) NOT NULL,
    "advertiser_external_id" VARCHAR(255) NOT NULL,
    "advertiser_name" VARCHAR(255) NOT NULL,
    "ad_library_id" VARCHAR(255) NOT NULL,
    "creative_body" TEXT,
    "media_url" TEXT,
    "target_domain" TEXT,
    "first_observed_at" TIMESTAMPTZ NOT NULL,
    "last_observed_at" TIMESTAMPTZ NOT NULL,
    "data_class" VARCHAR(50) NOT NULL DEFAULT 'public_observed',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_ad_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "plan_tier" VARCHAR(50) NOT NULL DEFAULT 'STARTER',
    "billing_cycle" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
    "status" "SubStatus" NOT NULL DEFAULT 'TRIAL',
    "razorpay_customer_id" VARCHAR(255),
    "razorpay_subscription_id" VARCHAR(255),
    "current_period_start" TIMESTAMPTZ NOT NULL,
    "current_period_end" TIMESTAMPTZ NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "period_start" TIMESTAMPTZ NOT NULL,
    "period_end" TIMESTAMPTZ NOT NULL,
    "prompt_runs_used" INTEGER NOT NULL DEFAULT 0,
    "prompt_runs_limit" INTEGER NOT NULL DEFAULT 100,
    "ad_syncs_used" INTEGER NOT NULL DEFAULT 0,
    "ad_syncs_limit" INTEGER NOT NULL DEFAULT 30,
    "active_projects_count" INTEGER NOT NULL DEFAULT 1,
    "active_projects_limit" INTEGER NOT NULL DEFAULT 2,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "razorpay_payment_id" VARCHAR(255) NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" VARCHAR(50) NOT NULL,
    "invoice_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "event_id" VARCHAR(255) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "target_entity" VARCHAR(50) NOT NULL,
    "target_id" UUID NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_exports" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "export_type" VARCHAR(20) NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_size_bytes" INTEGER,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'INFO',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brands_project_id_idx" ON "brands"("project_id");

-- CreateIndex
CREATE INDEX "brands_organization_id_idx" ON "brands"("organization_id");

-- CreateIndex
CREATE INDEX "competitors_project_id_idx" ON "competitors"("project_id");

-- CreateIndex
CREATE INDEX "competitors_organization_id_idx" ON "competitors"("organization_id");

-- CreateIndex
CREATE INDEX "prompt_groups_project_id_idx" ON "prompt_groups"("project_id");

-- CreateIndex
CREATE INDEX "prompt_groups_organization_id_idx" ON "prompt_groups"("organization_id");

-- CreateIndex
CREATE INDEX "tracked_prompts_is_active_next_run_at_idx" ON "tracked_prompts"("is_active", "next_run_at");

-- CreateIndex
CREATE INDEX "tracked_prompts_project_id_idx" ON "tracked_prompts"("project_id");

-- CreateIndex
CREATE INDEX "tracked_prompts_group_id_idx" ON "tracked_prompts"("group_id");

-- CreateIndex
CREATE INDEX "tracking_runs_project_id_created_at_idx" ON "tracking_runs"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tracking_runs_organization_id_idx" ON "tracking_runs"("organization_id");

-- CreateIndex
CREATE INDEX "prompt_runs_prompt_id_created_at_idx" ON "prompt_runs"("prompt_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "prompt_runs_tracking_run_id_idx" ON "prompt_runs"("tracking_run_id");

-- CreateIndex
CREATE INDEX "prompt_runs_organization_id_idx" ON "prompt_runs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_responses_prompt_run_id_key" ON "ai_responses"("prompt_run_id");

-- CreateIndex
CREATE INDEX "ai_responses_prompt_run_id_idx" ON "ai_responses"("prompt_run_id");

-- CreateIndex
CREATE INDEX "response_mentions_ai_response_id_idx" ON "response_mentions"("ai_response_id");

-- CreateIndex
CREATE INDEX "response_mentions_matched_entity_id_idx" ON "response_mentions"("matched_entity_id");

-- CreateIndex
CREATE INDEX "citations_ai_response_id_idx" ON "citations"("ai_response_id");

-- CreateIndex
CREATE INDEX "citations_domain_idx" ON "citations"("domain");

-- CreateIndex
CREATE INDEX "visibility_aggregates_project_id_aggregation_date_idx" ON "visibility_aggregates"("project_id", "aggregation_date");

-- CreateIndex
CREATE UNIQUE INDEX "visibility_aggregates_project_id_aggregation_date_provider_key" ON "visibility_aggregates"("project_id", "aggregation_date", "provider");

-- CreateIndex
CREATE INDEX "recommendations_project_id_status_idx" ON "recommendations"("project_id", "status");

-- CreateIndex
CREATE INDEX "recommendations_organization_id_idx" ON "recommendations"("organization_id");

-- CreateIndex
CREATE INDEX "tracking_schedules_project_id_idx" ON "tracking_schedules"("project_id");

-- CreateIndex
CREATE INDEX "tracking_schedules_organization_id_idx" ON "tracking_schedules"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_records_prompt_run_id_key" ON "ai_usage_records"("prompt_run_id");

-- CreateIndex
CREATE INDEX "ai_usage_records_project_id_created_at_idx" ON "ai_usage_records"("project_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_usage_records_organization_id_idx" ON "ai_usage_records"("organization_id");

-- CreateIndex
CREATE INDEX "ad_connections_organization_id_platform_idx" ON "ad_connections"("organization_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ad_connections_organization_id_platform_account_id_external_key" ON "ad_connections"("organization_id", "platform", "account_id_external");

-- CreateIndex
CREATE INDEX "ad_insights_ad_connection_id_report_date_idx" ON "ad_insights"("ad_connection_id", "report_date");

-- CreateIndex
CREATE UNIQUE INDEX "ad_insights_ad_connection_id_report_date_campaign_external__key" ON "ad_insights"("ad_connection_id", "report_date", "campaign_external_id");

-- CreateIndex
CREATE UNIQUE INDEX "public_ad_observations_ad_library_id_key" ON "public_ad_observations"("ad_library_id");

-- CreateIndex
CREATE INDEX "public_ad_observations_advertiser_name_idx" ON "public_ad_observations"("advertiser_name");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organization_id_key" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_razorpay_subscription_id_key" ON "subscriptions"("razorpay_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "usage_counters_organization_id_period_start_idx" ON "usage_counters"("organization_id", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_organization_id_period_start_key" ON "usage_counters"("organization_id", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "payments_subscription_id_idx" ON "payments"("subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events"("event_id");

-- CreateIndex
CREATE INDEX "webhook_events_provider_event_id_idx" ON "webhook_events"("provider", "event_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "report_exports_organization_id_created_at_idx" ON "report_exports"("organization_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_organization_id_is_read_idx" ON "notifications"("organization_id", "is_read");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_groups" ADD CONSTRAINT "prompt_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_groups" ADD CONSTRAINT "prompt_groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_prompts" ADD CONSTRAINT "tracked_prompts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_prompts" ADD CONSTRAINT "tracked_prompts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracked_prompts" ADD CONSTRAINT "tracked_prompts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "prompt_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_runs" ADD CONSTRAINT "tracking_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_runs" ADD CONSTRAINT "tracking_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_runs" ADD CONSTRAINT "prompt_runs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_runs" ADD CONSTRAINT "prompt_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_runs" ADD CONSTRAINT "prompt_runs_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "tracked_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_runs" ADD CONSTRAINT "prompt_runs_tracking_run_id_fkey" FOREIGN KEY ("tracking_run_id") REFERENCES "tracking_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_responses" ADD CONSTRAINT "ai_responses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_responses" ADD CONSTRAINT "ai_responses_prompt_run_id_fkey" FOREIGN KEY ("prompt_run_id") REFERENCES "prompt_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_mentions" ADD CONSTRAINT "response_mentions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_mentions" ADD CONSTRAINT "response_mentions_ai_response_id_fkey" FOREIGN KEY ("ai_response_id") REFERENCES "ai_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_ai_response_id_fkey" FOREIGN KEY ("ai_response_id") REFERENCES "ai_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visibility_aggregates" ADD CONSTRAINT "visibility_aggregates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visibility_aggregates" ADD CONSTRAINT "visibility_aggregates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_schedules" ADD CONSTRAINT "tracking_schedules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_schedules" ADD CONSTRAINT "tracking_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_tracking_run_id_fkey" FOREIGN KEY ("tracking_run_id") REFERENCES "tracking_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_records" ADD CONSTRAINT "ai_usage_records_prompt_run_id_fkey" FOREIGN KEY ("prompt_run_id") REFERENCES "prompt_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_connections" ADD CONSTRAINT "ad_connections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_connections" ADD CONSTRAINT "ad_connections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_insights" ADD CONSTRAINT "ad_insights_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_insights" ADD CONSTRAINT "ad_insights_ad_connection_id_fkey" FOREIGN KEY ("ad_connection_id") REFERENCES "ad_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_invitations_email" RENAME TO "invitations_email_idx";

-- RenameIndex
ALTER INDEX "idx_invitations_org" RENAME TO "invitations_organization_id_idx";

-- RenameIndex
ALTER INDEX "idx_invitations_token" RENAME TO "invitations_token_idx";

-- RenameIndex
ALTER INDEX "idx_org_members_org" RENAME TO "organization_members_organization_id_idx";

-- RenameIndex
ALTER INDEX "idx_org_members_user" RENAME TO "organization_members_user_id_idx";

-- RenameIndex
ALTER INDEX "uq_org_user" RENAME TO "organization_members_organization_id_user_id_key";

-- RenameIndex
ALTER INDEX "idx_projects_org" RENAME TO "projects_organization_id_idx";

-- RenameIndex
ALTER INDEX "idx_projects_workspace" RENAME TO "projects_workspace_id_idx";

-- RenameIndex
ALTER INDEX "idx_workspaces_org" RENAME TO "workspaces_organization_id_idx";

-- RenameIndex
ALTER INDEX "uq_org_workspace_slug" RENAME TO "workspaces_organization_id_slug_key";

