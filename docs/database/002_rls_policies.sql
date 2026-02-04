-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- Run this AFTER 001_schema.sql
-- =====================================================

-- Enable RLS
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
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prd_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- USER ROLES
CREATE POLICY "View own or super admin roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_app_role(auth.uid(), 'super_admin') OR user_id = auth.uid());
CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_app_role(auth.uid(), 'super_admin'));

-- TEAMS
CREATE POLICY "Members view teams" ON public.teams FOR SELECT TO authenticated USING (public.is_team_member(auth.uid(), id));
CREATE POLICY "Authenticated create teams" ON public.teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Owners/admins update teams" ON public.teams FOR UPDATE TO authenticated USING (public.has_team_role(auth.uid(), id, 'owner') OR public.has_team_role(auth.uid(), id, 'admin'));
CREATE POLICY "Owners delete teams" ON public.teams FOR DELETE TO authenticated USING (public.has_team_role(auth.uid(), id, 'owner'));

-- TEAM MEMBERS
CREATE POLICY "Members view team members" ON public.team_members FOR SELECT TO authenticated USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Owners/admins add members" ON public.team_members FOR INSERT TO authenticated WITH CHECK (public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin'));
CREATE POLICY "Owners/admins update members" ON public.team_members FOR UPDATE TO authenticated USING (public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin'));
CREATE POLICY "Owners/admins remove members" ON public.team_members FOR DELETE TO authenticated USING ((public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin')) AND NOT (user_id = auth.uid() AND role = 'owner'));

-- TEAM INVITES
CREATE POLICY "Members view invites" ON public.team_invites FOR SELECT TO authenticated USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Owners/admins create invites" ON public.team_invites FOR INSERT TO authenticated WITH CHECK (public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin'));
CREATE POLICY "Owners/admins update invites" ON public.team_invites FOR UPDATE TO authenticated USING (public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin'));
CREATE POLICY "Owners/admins delete invites" ON public.team_invites FOR DELETE TO authenticated USING (public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin'));

-- PROJECTS
CREATE POLICY "Members view projects" ON public.projects FOR SELECT TO authenticated USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Members create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Members update projects" ON public.projects FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Owners/admins delete projects" ON public.projects FOR DELETE TO authenticated USING (public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin'));

-- LABELS
CREATE POLICY "Members view labels" ON public.labels FOR SELECT TO authenticated USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Members create labels" ON public.labels FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Members update labels" ON public.labels FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Owners/admins delete labels" ON public.labels FOR DELETE TO authenticated USING (public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin'));

-- CYCLES
CREATE POLICY "Members view cycles" ON public.cycles FOR SELECT TO authenticated USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Members create cycles" ON public.cycles FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Members update cycles" ON public.cycles FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Owners/admins delete cycles" ON public.cycles FOR DELETE TO authenticated USING (public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin'));

-- ISSUES
CREATE POLICY "Members view issues" ON public.issues FOR SELECT TO authenticated USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Members create issues" ON public.issues FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Members update issues" ON public.issues FOR UPDATE TO authenticated USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Owners/admins/creators delete issues" ON public.issues FOR DELETE TO authenticated USING (public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin') OR creator_id = auth.uid());

-- ISSUE LABELS
CREATE POLICY "Members view issue labels" ON public.issue_labels FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.issues WHERE issues.id = issue_labels.issue_id AND public.is_team_member(auth.uid(), issues.team_id)));
CREATE POLICY "Members manage issue labels" ON public.issue_labels FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.issues WHERE issues.id = issue_labels.issue_id AND public.is_team_member(auth.uid(), issues.team_id)));

-- COMMENTS
CREATE POLICY "Members view comments" ON public.comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.issues WHERE issues.id = comments.issue_id AND public.is_team_member(auth.uid(), issues.team_id)));
CREATE POLICY "Members create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.issues WHERE issues.id = comments.issue_id AND public.is_team_member(auth.uid(), issues.team_id)));
CREATE POLICY "Authors update comments" ON public.comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authors/admins delete comments" ON public.comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.issues WHERE issues.id = comments.issue_id AND (public.has_team_role(auth.uid(), issues.team_id, 'owner') OR public.has_team_role(auth.uid(), issues.team_id, 'admin'))));

-- ACTIVITIES
CREATE POLICY "Members view activities" ON public.activities FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.issues WHERE issues.id = activities.issue_id AND public.is_team_member(auth.uid(), issues.team_id)));
CREATE POLICY "Members create activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.issues WHERE issues.id = activities.issue_id AND public.is_team_member(auth.uid(), issues.team_id)));

-- CONVERSATIONS
CREATE POLICY "Users view own conversations" ON public.conversations FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own conversations" ON public.conversations FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own conversations" ON public.conversations FOR DELETE TO authenticated USING (user_id = auth.uid());

-- MESSAGES
CREATE POLICY "Users view own messages" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users create messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));

-- PRD DOCUMENTS
CREATE POLICY "Members view PRDs" ON public.prd_documents FOR SELECT TO authenticated USING (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Members create PRDs" ON public.prd_documents FOR INSERT TO authenticated WITH CHECK (public.is_team_member(auth.uid(), team_id));
CREATE POLICY "Creators/admins update PRDs" ON public.prd_documents FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin'));
CREATE POLICY "Creators/admins delete PRDs" ON public.prd_documents FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_team_role(auth.uid(), team_id, 'owner') OR public.has_team_role(auth.uid(), team_id, 'admin'));

-- USER AI SETTINGS
CREATE POLICY "Users view own AI settings" ON public.user_ai_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create own AI settings" ON public.user_ai_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own AI settings" ON public.user_ai_settings FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own AI settings" ON public.user_ai_settings FOR DELETE TO authenticated USING (user_id = auth.uid());
