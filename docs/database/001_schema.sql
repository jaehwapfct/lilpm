-- =====================================================
-- COMPLETE DATABASE SCHEMA FOR LINEAR CLONE
-- Run this in Supabase SQL Editor
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

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferred_ai_provider ai_provider DEFAULT 'anthropic',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  issue_prefix TEXT NOT NULL DEFAULT 'ISS',
  issue_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'member',
  status invite_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE public.labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366F1',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, name)
);

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

CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES public.issues(id) ON DELETE SET NULL,
  identifier TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status issue_status DEFAULT 'backlog',
  priority issue_priority DEFAULT 'none',
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  estimate INTEGER,
  due_date DATE,
  sort_order DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, identifier)
);

CREATE TABLE public.issue_labels (
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  label_id UUID REFERENCES public.labels(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (issue_id, label_id)
);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type activity_type NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. AI CHAT & PRD TABLES
-- =====================================================

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

CREATE TABLE public.prd_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  title TEXT NOT NULL,
  overview TEXT,
  goals JSONB DEFAULT '[]',
  user_stories JSONB DEFAULT '[]',
  requirements JSONB DEFAULT '[]',
  timeline TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived')),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  anthropic_api_key TEXT,
  openai_api_key TEXT,
  gemini_api_key TEXT,
  default_provider ai_provider DEFAULT 'anthropic',
  auto_mode_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. INDEXES
-- =====================================================

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_issues_team_id ON public.issues(team_id);
CREATE INDEX idx_issues_project_id ON public.issues(project_id);
CREATE INDEX idx_issues_assignee_id ON public.issues(assignee_id);
CREATE INDEX idx_issues_status ON public.issues(status);
CREATE INDEX idx_issues_identifier ON public.issues(identifier);
CREATE INDEX idx_comments_issue_id ON public.comments(issue_id);
CREATE INDEX idx_activities_issue_id ON public.activities(issue_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);

-- =====================================================
-- 5. SECURITY FUNCTIONS
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
-- 6. TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

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
