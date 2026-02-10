-- =====================================================
-- LILPM COMPLETE DATABASE SCHEMA (CONSOLIDATED)
-- For lilpm-dev environment
-- Created: 2026-02-09
-- =====================================================
-- This is a complete schema that includes:
-- 1. Core tables from 001_schema.sql
-- 2. Additional tables from migrations
-- 3. RLS policies
-- 4. Helper functions
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================
CREATE TYPE public.team_role AS ENUM ('owner', 'admin', 'member', 'guest');
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');
CREATE TYPE public.project_status AS ENUM ('planned', 'in_progress', 'paused', 'completed', 'cancelled');
CREATE TYPE public.issue_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled');
CREATE TYPE public.issue_priority AS ENUM ('urgent', 'high', 'medium', 'low', 'none');
CREATE TYPE public.cycle_status AS ENUM ('upcoming', 'active', 'completed');
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');
CREATE TYPE public.activity_type AS ENUM (
  'issue_created', 'issue_updated', 'status_changed', 'priority_changed',
  'assignee_changed', 'label_added', 'label_removed', 'comment_added',
  'comment_updated', 'comment_deleted'
);
CREATE TYPE public.ai_provider AS ENUM ('anthropic', 'openai', 'gemini', 'auto');

-- =====================================================
-- 2. CORE TABLES
-- =====================================================

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferred_ai_provider ai_provider DEFAULT 'anthropic',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  issue_prefix TEXT NOT NULL DEFAULT 'ISS',
  issue_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

-- Team Invites
CREATE TABLE public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'member',
  status invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  project_ids UUID[] DEFAULT NULL
);

-- Projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366F1',
  icon TEXT,
  lead_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status project_status DEFAULT 'planned',
  start_date DATE,
  target_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, slug)
);

-- Labels
CREATE TABLE public.labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366F1',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, name)
);

-- Cycles (Sprints)
CREATE TABLE public.cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  number INTEGER NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status cycle_status DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  prd_id UUID,
  identifier TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status issue_status DEFAULT 'backlog',
  priority issue_priority DEFAULT 'none',
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  estimate INTEGER,
  due_date DATE,
  start_date DATE,
  sort_order DOUBLE PRECISION DEFAULT 0,
  archived_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, identifier)
);

-- Issue Labels (Many-to-Many)
CREATE TABLE public.issue_labels (
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  label_id UUID REFERENCES public.labels(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (issue_id, label_id)
);

-- Issue Dependencies
CREATE TABLE public.issue_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  depends_on_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  dependency_type TEXT DEFAULT 'blocks',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(issue_id, depends_on_id)
);

-- Comments
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type activity_type NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. AI & PRD TABLES
-- =====================================================

-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  title TEXT,
  ai_provider ai_provider DEFAULT 'anthropic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  tokens_used INTEGER,
  ai_provider ai_provider,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRD Documents
CREATE TABLE public.prd_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  overview TEXT,
  content JSONB,
  goals JSONB DEFAULT '[]',
  user_stories JSONB DEFAULT '[]',
  requirements JSONB DEFAULT '[]',
  timeline TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
  version INTEGER DEFAULT 1,
  archived_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User AI Settings
CREATE TABLE public.user_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  anthropic_api_key TEXT,
  openai_api_key TEXT,
  gemini_api_key TEXT,
  default_provider ai_provider DEFAULT 'anthropic',
  auto_mode_enabled BOOLEAN DEFAULT FALSE,
  provider TEXT DEFAULT 'openai',
  api_key TEXT,
  model TEXT DEFAULT 'gpt-4',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. ADDITIONAL TABLES
-- =====================================================

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Logs (Team-level)
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRD Versions
CREATE TABLE public.prd_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id UUID,
  prd_document_id UUID REFERENCES public.prd_documents(id) ON DELETE CASCADE,
  page_id UUID,
  version_number INT NOT NULL,
  title TEXT,
  content JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

-- PRD YJS State (Real-time collaboration)
CREATE TABLE public.prd_yjs_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id UUID UNIQUE NOT NULL,
  yjs_state BYTEA,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- PRD-Project Relationship
CREATE TABLE public.prd_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prd_id, project_id)
);

-- Issue Templates
CREATE TABLE public.issue_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  default_title TEXT,
  default_description JSONB,
  default_priority TEXT DEFAULT 'medium',
  default_labels TEXT[] DEFAULT '{}',
  default_estimate INT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Shares
CREATE TABLE public.conversation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_type TEXT DEFAULT 'link',
  access_level TEXT DEFAULT 'view',
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Access Requests
CREATE TABLE public.conversation_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  share_id UUID REFERENCES public.conversation_shares(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Databases (Notion-like)
CREATE TABLE public.databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  cover_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.database_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES public.databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.database_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES public.databases(id) ON DELETE CASCADE,
  properties JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.database_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_id UUID REFERENCES public.databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'table',
  config JSONB DEFAULT '{}',
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issue Versions
CREATE TABLE public.issue_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  page_id UUID,
  version_number INT NOT NULL,
  title TEXT,
  content JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Block Comments
CREATE TABLE public.block_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL,
  page_type TEXT NOT NULL,
  block_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.block_comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES public.block_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Members
CREATE TABLE public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- =====================================================
-- 5. INDEXES
-- =====================================================
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_invites_expires_at ON public.team_invites(expires_at);
CREATE INDEX idx_team_invites_token ON public.team_invites(token);
CREATE INDEX idx_issues_team_id ON public.issues(team_id);
CREATE INDEX idx_issues_project_id ON public.issues(project_id);
CREATE INDEX idx_issues_assignee_id ON public.issues(assignee_id);
CREATE INDEX idx_issues_status ON public.issues(status);
CREATE INDEX idx_issues_identifier ON public.issues(identifier);
CREATE INDEX idx_issues_prd_id ON public.issues(prd_id);
CREATE INDEX idx_issues_archived_at ON public.issues(archived_at) WHERE archived_at IS NULL;
CREATE INDEX idx_comments_issue_id ON public.comments(issue_id);
CREATE INDEX idx_activities_issue_id ON public.activities(issue_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_activity_logs_team_id ON public.activity_logs(team_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_prd_versions_prd_id ON public.prd_versions(prd_id);
CREATE INDEX idx_prd_versions_created_at ON public.prd_versions(created_at DESC);
CREATE INDEX idx_prd_yjs_state_updated_at ON public.prd_yjs_state(updated_at);
CREATE INDEX idx_prd_projects_prd_id ON public.prd_projects(prd_id);
CREATE INDEX idx_prd_projects_project_id ON public.prd_projects(project_id);
CREATE INDEX idx_issue_templates_team_id ON public.issue_templates(team_id);
CREATE INDEX idx_issue_dependencies_issue ON public.issue_dependencies(issue_id);
CREATE INDEX idx_issue_dependencies_depends_on ON public.issue_dependencies(depends_on_id);
CREATE INDEX idx_conversation_shares_token ON public.conversation_shares(share_token);
CREATE INDEX idx_databases_team_id ON public.databases(team_id);
CREATE INDEX idx_database_properties_database_id ON public.database_properties(database_id);
CREATE INDEX idx_database_rows_database_id ON public.database_rows(database_id);
CREATE INDEX idx_database_views_database_id ON public.database_views(database_id);
CREATE INDEX idx_issue_versions_page_id ON public.issue_versions(page_id);
CREATE INDEX idx_block_comments_page_id ON public.block_comments(page_id);
CREATE INDEX idx_block_comments_block_id ON public.block_comments(block_id);
CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_user ON public.project_members(user_id);
CREATE INDEX idx_prd_documents_archived_at ON public.prd_documents(archived_at) WHERE archived_at IS NULL;

-- =====================================================
-- 6. SECURITY HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_app_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = _user_id AND team_id = _team_id)
$$;

CREATE OR REPLACE FUNCTION public.is_team_member_safe(check_team_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM team_members WHERE team_id = check_team_id AND user_id = check_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin_safe(check_team_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM team_members WHERE team_id = check_team_id AND user_id = check_user_id AND role IN ('owner', 'admin'));
END;
$$;

CREATE OR REPLACE FUNCTION public.has_team_role(_user_id UUID, _team_id UUID, _role team_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = _user_id AND team_id = _team_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_team_role(_user_id UUID, _team_id UUID)
RETURNS team_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.team_members WHERE user_id = _user_id AND team_id = _team_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM project_members WHERE project_id = _project_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_team_admin_for_project(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects p
    JOIN team_members tm ON tm.team_id = p.team_id
    WHERE p.id = _project_id AND tm.user_id = _user_id AND tm.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_issue_identifier(_team_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _prefix TEXT; _count INTEGER;
BEGIN
  UPDATE public.teams SET issue_count = issue_count + 1 WHERE id = _team_id
  RETURNING issue_prefix, issue_count INTO _prefix, _count;
  RETURN _prefix || '-' || _count;
END;
$$;

-- =====================================================
-- 7. RPC FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_invite_preview(invite_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE invite_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', ti.id,
    'team_id', ti.team_id,
    'team_name', t.name,
    'team_logo', t.avatar_url,
    'email', ti.email,
    'role', ti.role,
    'status', ti.status,
    'expires_at', ti.expires_at,
    'invited_by_name', p.full_name,
    'invited_by_email', p.email
  ) INTO invite_data
  FROM team_invites ti
  JOIN teams t ON t.id = ti.team_id
  LEFT JOIN profiles p ON p.id = ti.invited_by
  WHERE ti.token = invite_token;
  RETURN invite_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_team_with_owner(
  team_name TEXT,
  team_description TEXT DEFAULT NULL,
  team_avatar_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_team_id UUID; current_user_id UUID; team_slug TEXT;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  team_slug := lower(regexp_replace(team_name, '[^a-zA-Z0-9]', '-', 'g'));
  INSERT INTO teams (name, slug, description, avatar_url, created_by)
  VALUES (team_name, team_slug || '-' || substr(gen_random_uuid()::text, 1, 8), team_description, team_avatar_url, current_user_id)
  RETURNING id INTO new_team_id;
  INSERT INTO team_members (team_id, user_id, role, joined_at) VALUES (new_team_id, current_user_id, 'owner', NOW());
  RETURN new_team_id;
END;
$$;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
          NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.set_invite_expires_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN NEW.expires_at := NOW() + INTERVAL '24 hours'; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.auto_assign_new_team_member_to_projects()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  SELECT p.id, NEW.user_id, 'member' FROM projects p WHERE p.team_id = NEW.team_id
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_cycles_updated_at BEFORE UPDATE ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_prd_documents_updated_at BEFORE UPDATE ON public.prd_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_user_ai_settings_updated_at BEFORE UPDATE ON public.user_ai_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_invite_expires_at_trigger ON public.team_invites;
CREATE TRIGGER set_invite_expires_at_trigger BEFORE INSERT ON public.team_invites FOR EACH ROW EXECUTE FUNCTION public.set_invite_expires_at();

DROP TRIGGER IF EXISTS trigger_auto_assign_projects ON public.team_members;
CREATE TRIGGER trigger_auto_assign_projects AFTER INSERT ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.auto_assign_new_team_member_to_projects();

-- =====================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prd_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prd_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prd_yjs_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issue_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_comment_replies ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Teams Policies
CREATE POLICY "Team members can view teams" ON public.teams FOR SELECT USING (is_team_member_safe(id, auth.uid()));
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Team admins can update teams" ON public.teams FOR UPDATE USING (is_team_admin_safe(id, auth.uid()));

-- Team Members Policies
CREATE POLICY "Team members can view team members" ON public.team_members FOR SELECT USING (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Users can insert themselves via valid invite" ON public.team_members FOR INSERT 
WITH CHECK (user_id = auth.uid() AND EXISTS (
  SELECT 1 FROM team_invites ti JOIN profiles p ON p.email = ti.email
  WHERE ti.team_id = team_members.team_id AND ti.status = 'pending' AND p.id = auth.uid()
));
CREATE POLICY "Team admins can manage members" ON public.team_members FOR ALL USING (is_team_admin_safe(team_id, auth.uid()));

-- Team Invites Policies
CREATE POLICY "Team members can view invites" ON public.team_invites FOR SELECT USING (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Authenticated users can view invite by token" ON public.team_invites FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Team admins can manage invites" ON public.team_invites FOR ALL USING (is_team_admin_safe(team_id, auth.uid()));

-- Projects Policies
CREATE POLICY "Users can view projects" ON public.projects FOR SELECT USING (is_project_member(id, auth.uid()) OR is_team_admin_for_project(id, auth.uid()));
CREATE POLICY "Team members can create projects" ON public.projects FOR INSERT WITH CHECK (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Team admins can update projects" ON public.projects FOR UPDATE USING (is_team_admin_for_project(id, auth.uid()));

-- Project Members Policies
CREATE POLICY "Team members can view project members" ON public.project_members FOR SELECT 
USING (EXISTS (SELECT 1 FROM project_members pm2 WHERE pm2.project_id = project_members.project_id AND pm2.user_id = auth.uid()) 
       OR is_team_admin_for_project(project_members.project_id, auth.uid()));
CREATE POLICY "Admins can manage project members" ON public.project_members FOR ALL USING (is_team_admin_for_project(project_id, auth.uid()));

-- Issues Policies
CREATE POLICY "Users can view issues" ON public.issues FOR SELECT USING (
  (project_id IS NULL AND is_team_member_safe(team_id, auth.uid())) OR
  (project_id IS NOT NULL AND (is_project_member(project_id, auth.uid()) OR is_team_admin_for_project(project_id, auth.uid())))
);
CREATE POLICY "Team members can create issues" ON public.issues FOR INSERT WITH CHECK (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Team members can update issues" ON public.issues FOR UPDATE USING (is_team_member_safe(team_id, auth.uid()));

-- Labels, Cycles, Comments, Activities
CREATE POLICY "Team members can view labels" ON public.labels FOR SELECT USING (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Team members can manage labels" ON public.labels FOR ALL USING (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Team members can view cycles" ON public.cycles FOR SELECT USING (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Team members can manage cycles" ON public.cycles FOR ALL USING (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Team members can view comments" ON public.comments FOR SELECT USING (EXISTS (SELECT 1 FROM issues i WHERE i.id = comments.issue_id AND is_team_member_safe(i.team_id, auth.uid())));
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Team members can view activities" ON public.activities FOR SELECT USING (EXISTS (SELECT 1 FROM issues i WHERE i.id = activities.issue_id AND is_team_member_safe(i.team_id, auth.uid())));

-- Conversations & Messages
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view messages in own conversations" ON public.messages FOR SELECT USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can manage messages in own conversations" ON public.messages FOR ALL USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()));

-- PRD Documents
CREATE POLICY "Team members can view PRDs" ON public.prd_documents FOR SELECT USING (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Team members can manage PRDs" ON public.prd_documents FOR ALL USING (is_team_member_safe(team_id, auth.uid()));

-- User AI Settings
CREATE POLICY "Users can manage own AI settings" ON public.user_ai_settings FOR ALL USING (user_id = auth.uid());

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Activity Logs
CREATE POLICY "Team members can view activity logs" ON public.activity_logs FOR SELECT USING (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Authenticated users can create activity logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Issue Dependencies
CREATE POLICY "Team members can view dependencies" ON public.issue_dependencies FOR SELECT USING (EXISTS (SELECT 1 FROM issues i WHERE i.id = issue_dependencies.issue_id AND is_team_member_safe(i.team_id, auth.uid())));
CREATE POLICY "Team members can manage dependencies" ON public.issue_dependencies FOR ALL USING (EXISTS (SELECT 1 FROM issues i WHERE i.id = issue_dependencies.issue_id AND is_team_member_safe(i.team_id, auth.uid())));

-- Issue Labels
CREATE POLICY "Team members can view issue labels" ON public.issue_labels FOR SELECT USING (EXISTS (SELECT 1 FROM issues i WHERE i.id = issue_labels.issue_id AND is_team_member_safe(i.team_id, auth.uid())));
CREATE POLICY "Team members can manage issue labels" ON public.issue_labels FOR ALL USING (EXISTS (SELECT 1 FROM issues i WHERE i.id = issue_labels.issue_id AND is_team_member_safe(i.team_id, auth.uid())));

-- Databases
CREATE POLICY "Team members can view databases" ON public.databases FOR SELECT USING (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Team members can manage databases" ON public.databases FOR ALL USING (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Database owners can manage properties" ON public.database_properties FOR ALL USING (EXISTS (SELECT 1 FROM databases d WHERE d.id = database_properties.database_id AND is_team_member_safe(d.team_id, auth.uid())));
CREATE POLICY "Database owners can manage rows" ON public.database_rows FOR ALL USING (EXISTS (SELECT 1 FROM databases d WHERE d.id = database_rows.database_id AND is_team_member_safe(d.team_id, auth.uid())));
CREATE POLICY "Database owners can manage views" ON public.database_views FOR ALL USING (EXISTS (SELECT 1 FROM databases d WHERE d.id = database_views.database_id AND is_team_member_safe(d.team_id, auth.uid())));

-- Issue Templates
CREATE POLICY "Team members can view templates" ON public.issue_templates FOR SELECT USING (is_team_member_safe(team_id, auth.uid()));
CREATE POLICY "Team admins can manage templates" ON public.issue_templates FOR ALL USING (is_team_admin_safe(team_id, auth.uid()));

-- Conversation Shares
CREATE POLICY "Users can manage own conversation shares" ON public.conversation_shares FOR ALL USING (created_by = auth.uid());
CREATE POLICY "Users can view active shares" ON public.conversation_shares FOR SELECT USING (is_active = true);

-- Block Comments
CREATE POLICY "Authenticated users can view block comments" ON public.block_comments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage block comments" ON public.block_comments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can view block comment replies" ON public.block_comment_replies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage block comment replies" ON public.block_comment_replies FOR ALL USING (auth.uid() IS NOT NULL);

-- PRD Versions & YJS State
CREATE POLICY "Team members can view PRD versions" ON public.prd_versions FOR SELECT USING (EXISTS (SELECT 1 FROM prd_documents p WHERE p.id = prd_versions.prd_document_id AND is_team_member_safe(p.team_id, auth.uid())));
CREATE POLICY "Team members can manage PRD versions" ON public.prd_versions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage PRD YJS state" ON public.prd_yjs_state FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- DONE!
-- =====================================================
