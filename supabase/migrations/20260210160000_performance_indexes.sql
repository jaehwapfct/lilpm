-- =============================================================================
-- Performance Optimization: Additional Indexes
-- Created: 2026-02-10
-- Purpose: Add missing indexes for common query patterns to improve performance
-- All index creations are wrapped in DO blocks for safety across environments
-- =============================================================================

DO $$
BEGIN

  -- 1. NOTIFICATIONS
  CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON public.notifications (user_id, read, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_user_type
    ON public.notifications (user_id, type);

  -- 2. ACTIVITIES
  CREATE INDEX IF NOT EXISTS idx_activities_issue_created
    ON public.activities (issue_id, created_at DESC);

  -- 3. ACTIVITY_LOGS
  CREATE INDEX IF NOT EXISTS idx_activity_logs_team_created
    ON public.activity_logs (team_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
    ON public.activity_logs (user_id, created_at DESC);

  -- 4. ISSUES - partial indexes with archived_at (only if column exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issues' AND column_name='archived_at') THEN
    CREATE INDEX IF NOT EXISTS idx_issues_project_status
      ON public.issues (project_id, status) WHERE archived_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_issues_assignee_status
      ON public.issues (assignee_id, status) WHERE archived_at IS NULL AND assignee_id IS NOT NULL;
  ELSE
    CREATE INDEX IF NOT EXISTS idx_issues_project_status
      ON public.issues (project_id, status);
    CREATE INDEX IF NOT EXISTS idx_issues_assignee_status
      ON public.issues (assignee_id, status) WHERE assignee_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issues' AND column_name='cycle_id') THEN
    CREATE INDEX IF NOT EXISTS idx_issues_cycle_status
      ON public.issues (cycle_id, status) WHERE cycle_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issues' AND column_name='parent_id') THEN
    CREATE INDEX IF NOT EXISTS idx_issues_parent_id
      ON public.issues (parent_id) WHERE parent_id IS NOT NULL;
  END IF;

  -- 5. TEAM_INVITES
  CREATE INDEX IF NOT EXISTS idx_team_invites_email
    ON public.team_invites (email);
  CREATE INDEX IF NOT EXISTS idx_team_invites_status_pending
    ON public.team_invites (team_id) WHERE status = 'pending';

  -- 6. DATABASE_ROWS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='database_rows') THEN
    CREATE INDEX IF NOT EXISTS idx_database_rows_properties_gin
      ON public.database_rows USING GIN (properties);
    CREATE INDEX IF NOT EXISTS idx_database_rows_db_created
      ON public.database_rows (database_id, created_at DESC);
  END IF;

  -- 7. COMMENTS
  CREATE INDEX IF NOT EXISTS idx_comments_issue_created
    ON public.comments (issue_id, created_at DESC);

  -- 8. PRD_DOCUMENTS
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='prd_documents' AND column_name='archived_at') THEN
    CREATE INDEX IF NOT EXISTS idx_prd_documents_team_created
      ON public.prd_documents (team_id, created_at DESC) WHERE archived_at IS NULL;
  ELSE
    CREATE INDEX IF NOT EXISTS idx_prd_documents_team_created
      ON public.prd_documents (team_id, created_at DESC);
  END IF;

  -- 9. MESSAGES
  CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
    ON public.messages (conversation_id, created_at ASC);

  -- 10. CONVERSATIONS
  CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
    ON public.conversations (user_id, updated_at DESC);

  -- 11. PROJECT_MEMBERS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='project_members') THEN
    CREATE INDEX IF NOT EXISTS idx_project_members_project_user
      ON public.project_members (project_id, user_id);
  END IF;

  -- 12. BLOCK_COMMENTS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='block_comments') THEN
    CREATE INDEX IF NOT EXISTS idx_block_comments_page_type_id
      ON public.block_comments (page_type, page_id);
  END IF;

  RAISE NOTICE 'Performance indexes migration completed successfully';
END $$;
