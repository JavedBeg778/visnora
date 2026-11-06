-- =============================================================================
-- VISNORA — MILESTONE M1: SAAS FOUNDATION DATABASE SCHEMA & RLS POLICIES
-- Target: PostgreSQL 16+ (Supabase)
-- =============================================================================

-- 1. Create Enums if they do not exist
DO $$ BEGIN
    CREATE TYPE org_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'ANALYST', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE member_status AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    website VARCHAR(255),
    org_type VARCHAR(50) DEFAULT 'business',
    logo_url TEXT,
    billing_email VARCHAR(255) NOT NULL,
    country_code VARCHAR(2) NOT NULL DEFAULT 'IN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Organization Members Table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users(id)
    role org_role NOT NULL DEFAULT 'ANALYST',
    status member_status NOT NULL DEFAULT 'ACTIVE',
    invited_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_org_user UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);

-- 4. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_org_workspace_slug UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_org ON public.workspaces(organization_id);

-- 5. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    primary_website TEXT NOT NULL,
    industry VARCHAR(100),
    target_country VARCHAR(2) NOT NULL DEFAULT 'IN',
    default_language VARCHAR(5) NOT NULL DEFAULT 'en',
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON public.projects(workspace_id);

-- 6. Team Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role org_role NOT NULL DEFAULT 'MEMBER',
    token VARCHAR(255) UNIQUE NOT NULL,
    invited_by UUID NOT NULL,
    status invitation_status NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);

-- 7. User Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY, -- Matches auth.users(id)
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    company VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & HELPER FUNCTIONS
-- =============================================================================

-- Helper: Check if auth.uid() is an active member of organization
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_org_id
          AND user_id = auth.uid()
          AND status = 'ACTIVE'
    );
$$;

-- Helper: Check if auth.uid() has Admin or Owner role in organization
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_org_id
          AND user_id = auth.uid()
          AND status = 'ACTIVE'
          AND role IN ('OWNER', 'ADMIN')
    );
$$;

-- Helper: Check if auth.uid() is Owner of organization
CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_org_id
          AND user_id = auth.uid()
          AND status = 'ACTIVE'
          AND role = 'OWNER'
    );
$$;

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Organizations Policies
CREATE POLICY "Users can view organizations they belong to"
    ON public.organizations FOR SELECT
    USING (public.is_org_member(id));

CREATE POLICY "Owners and Admins can update organization settings"
    ON public.organizations FOR UPDATE
    USING (public.is_org_admin(id))
    WITH CHECK (public.is_org_admin(id));

CREATE POLICY "Authenticated users can create an organization"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Organization Members Policies
CREATE POLICY "Members can view members of their organization"
    ON public.organization_members FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Admins and Owners can insert organization members"
    ON public.organization_members FOR INSERT
    WITH CHECK (public.is_org_admin(organization_id) OR auth.uid() = user_id);

CREATE POLICY "Admins and Owners can update non-owner members"
    ON public.organization_members FOR UPDATE
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Owners can manage all member roles"
    ON public.organization_members FOR ALL
    USING (public.is_org_owner(organization_id));

-- Workspaces Policies
CREATE POLICY "Members can view workspaces in their organization"
    ON public.workspaces FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Admins, Owners, and Members can create workspaces"
    ON public.workspaces FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Admins and Owners can update workspaces"
    ON public.workspaces FOR UPDATE
    USING (public.is_org_admin(organization_id))
    WITH CHECK (public.is_org_admin(organization_id));

-- Projects Policies
CREATE POLICY "Members can view projects in their organization"
    ON public.projects FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Admins, Owners, and Members can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Admins, Owners, and Members can update projects"
    ON public.projects FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Invitations Policies
CREATE POLICY "Members can view invitations for their organization"
    ON public.invitations FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Admins and Owners can create invitations"
    ON public.invitations FOR INSERT
    WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Admins and Owners can delete or revoke invitations"
    ON public.invitations FOR DELETE
    USING (public.is_org_admin(organization_id));

-- User Profiles Policies
CREATE POLICY "Users can view all user profiles in their tenant"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

