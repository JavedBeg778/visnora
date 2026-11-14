-- Visnora — Security Hardening Migration
-- Reference: docs/SECURITY.md & Phase 1 Audit Findings 1, 2, 3, 12
-- Safe, additive migration — preserves all existing records and tenant relationships.

-- 1. Fix organization_members RLS policy to eliminate privilege escalation
DROP POLICY IF EXISTS "Admins and Owners can insert organization members" ON public.organization_members;
CREATE POLICY "Admins and Owners can insert organization members"
    ON public.organization_members FOR INSERT
    WITH CHECK (public.is_org_admin(organization_id));

-- 2. Fix user_profiles RLS policy to restrict to self and co-organization members
DROP POLICY IF EXISTS "Users can view all user profiles in their tenant" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile and co-members" ON public.user_profiles;
CREATE POLICY "Users can view their own profile and co-members"
    ON public.user_profiles FOR SELECT
    USING (
        auth.uid() = id
        OR EXISTS (
            SELECT 1 FROM public.organization_members m1
            JOIN public.organization_members m2 ON m1.organization_id = m2.organization_id
            WHERE m1.user_id = auth.uid() AND m2.user_id = public.user_profiles.id
        )
    );

-- 3. Enable RLS and Tenant Isolation on M2 Tables
-- 3.1 brands
ALTER TABLE IF EXISTS public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view brands in their organization" ON public.brands;
CREATE POLICY "Members can view brands in their organization"
    ON public.brands FOR SELECT
    USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Admins can manage brands in their organization" ON public.brands;
CREATE POLICY "Admins can manage brands in their organization"
    ON public.brands FOR ALL
    USING (public.is_org_admin(organization_id));

-- 3.2 competitors
ALTER TABLE IF EXISTS public.competitors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view competitors in their organization" ON public.competitors;
CREATE POLICY "Members can view competitors in their organization"
    ON public.competitors FOR SELECT
    USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Admins can manage competitors in their organization" ON public.competitors;
CREATE POLICY "Admins can manage competitors in their organization"
    ON public.competitors FOR ALL
    USING (public.is_org_admin(organization_id));

-- 3.3 tracked_prompts (Prisma model TrackedPrompt maps to tracked_prompts)
ALTER TABLE IF EXISTS public.tracked_prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view tracked_prompts in their organization" ON public.tracked_prompts;
CREATE POLICY "Members can view tracked_prompts in their organization"
    ON public.tracked_prompts FOR SELECT
    USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Admins can manage tracked_prompts in their organization" ON public.tracked_prompts;
CREATE POLICY "Admins can manage tracked_prompts in their organization"
    ON public.tracked_prompts FOR ALL
    USING (public.is_org_admin(organization_id));

-- 3.4 tracking_runs
ALTER TABLE IF EXISTS public.tracking_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view tracking_runs in their organization" ON public.tracking_runs;
CREATE POLICY "Members can view tracking_runs in their organization"
    ON public.tracking_runs FOR SELECT
    USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Admins can manage tracking_runs in their organization" ON public.tracking_runs;
CREATE POLICY "Admins can manage tracking_runs in their organization"
    ON public.tracking_runs FOR ALL
    USING (public.is_org_admin(organization_id));

-- 3.5 prompt_runs
ALTER TABLE IF EXISTS public.prompt_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view prompt_runs in their organization" ON public.prompt_runs;
CREATE POLICY "Members can view prompt_runs in their organization"
    ON public.prompt_runs FOR SELECT
    USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Admins can manage prompt_runs in their organization" ON public.prompt_runs;
CREATE POLICY "Admins can manage prompt_runs in their organization"
    ON public.prompt_runs FOR ALL
    USING (public.is_org_admin(organization_id));

-- 3.6 ai_responses
ALTER TABLE IF EXISTS public.ai_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view ai_responses in their organization" ON public.ai_responses;
CREATE POLICY "Members can view ai_responses in their organization"
    ON public.ai_responses FOR SELECT
    USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Admins can manage ai_responses in their organization" ON public.ai_responses;
CREATE POLICY "Admins can manage ai_responses in their organization"
    ON public.ai_responses FOR ALL
    USING (public.is_org_admin(organization_id));

-- 3.7 citations
ALTER TABLE IF EXISTS public.citations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view citations in their organization" ON public.citations;
CREATE POLICY "Members can view citations in their organization"
    ON public.citations FOR SELECT
    USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Admins can manage citations in their organization" ON public.citations;
CREATE POLICY "Admins can manage citations in their organization"
    ON public.citations FOR ALL
    USING (public.is_org_admin(organization_id));

-- 3.8 recommendations
ALTER TABLE IF EXISTS public.recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view recommendations in their organization" ON public.recommendations;
CREATE POLICY "Members can view recommendations in their organization"
    ON public.recommendations FOR SELECT
    USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "Admins can manage recommendations in their organization" ON public.recommendations;
CREATE POLICY "Admins can manage recommendations in their organization"
    ON public.recommendations FOR ALL
    USING (public.is_org_admin(organization_id));

-- 4. Enable RLS and Immutability on Audit Logs
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs in their organization" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs in their organization"
    ON public.audit_logs FOR SELECT
    USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Members can insert audit logs" ON public.audit_logs;
CREATE POLICY "Members can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

-- Immutability trigger: prevent UPDATE and DELETE on audit_logs
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_audit_logs ON public.audit_logs;
CREATE TRIGGER trg_immutable_audit_logs
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

-- 5. Concurrency-Safe Invoice Number Sequence
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1 INCREMENT BY 1;
