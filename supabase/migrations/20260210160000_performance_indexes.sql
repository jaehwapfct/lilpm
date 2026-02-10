-- =============================================================================
-- Performance Optimization: Additional Indexes
-- Created: 2026-02-10
-- Purpose: Add missing indexes for common query patterns to improve performance
-- =============================================================================

-- ============================================
-- 1. NOTIFICATIONS - User notification queries
-- ============================================
-- Composite index for fetching unread notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, read, created_at DESC);

-- Index for notification type filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_type
  ON public.notifications (user_id, type);

-- ============================================
-- 2. ACTIVITIES - Activity feed queries
-- ============================================
-- Composite index for issue activity feed (sorted by creation date)
CREATE INDEX IF NOT EXISTS idx_activities_issue_created
  ON public.activities (issue_id, created_at DESC);

-- ============================================
-- 3. ACTIVITY_LOGS - Team activity timeline
-- ============================================
-- Composite index for team activity queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_team_created
  ON public.activity_logs (team_id, created_at DESC);

-- Index for user-specific activity queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
  ON public.activity_logs (user_id, created_at DESC);

-- ============================================
-- 4. ISSUES - Enhanced query performance
-- ============================================
-- Composite index for project-scoped issue queries by status
CREATE INDEX IF NOT EXISTS idx_issues_project_status
  ON public.issues (project_id, status) WHERE archived_at IS NULL;

-- Composite index for assignee-based queries
CREATE INDEX IF NOT EXISTS idx_issues_assignee_status
  ON public.issues (assignee_id, status) WHERE archived_at IS NULL AND assignee_id IS NOT NULL;

-- Index for cycle-based issue queries
CREATE INDEX IF NOT EXISTS idx_issues_cycle_status
  ON public.issues (cycle_id, status) WHERE cycle_id IS NOT NULL;

-- Index for parent-child issue queries
CREATE INDEX IF NOT EXISTS idx_issues_parent_id
  ON public.issues (parent_id) WHERE parent_id IS NOT NULL;

-- ============================================
-- 5. TEAM_INVITES - Email-based lookups
-- ============================================
-- Index for email-based invite lookups (used in accept-invite flow)
CREATE INDEX IF NOT EXISTS idx_team_invites_email
  ON public.team_invites (email);

-- Index for pending invites (most common status query)
CREATE INDEX IF NOT EXISTS idx_team_invites_status_pending
  ON public.team_invites (team_id) WHERE status = 'pending';

-- ============================================
-- 6. DATABASE_ROWS - JSONB GIN index for flexible queries
-- ============================================
-- GIN index for JSONB containment queries on database rows
CREATE INDEX IF NOT EXISTS idx_database_rows_properties_gin
  ON public.database_rows USING GIN (properties);

-- Composite index for database row ordering
CREATE INDEX IF NOT EXISTS idx_database_rows_db_position
  ON public.database_rows (database_id, position);

-- ============================================
-- 7. COMMENTS - Issue comment queries
-- ============================================
-- Index for loading issue comments sorted by creation
CREATE INDEX IF NOT EXISTS idx_comments_issue_created
  ON public.comments (issue_id, created_at DESC);

-- ============================================
-- 8. PRD_DOCUMENTS - PRD queries
-- ============================================
-- Composite index for team-scoped PRD queries
CREATE INDEX IF NOT EXISTS idx_prd_documents_team_created
  ON public.prd_documents (team_id, created_at DESC) WHERE archived_at IS NULL;

-- ============================================
-- 9. MESSAGES - Conversation message queries
-- ============================================
-- Composite index for conversation messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages (conversation_id, created_at ASC);

-- ============================================
-- 10. CONVERSATIONS - User conversation queries
-- ============================================
-- Index for user's conversations sorted by recency
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON public.conversations (user_id, updated_at DESC);

-- ============================================
-- 11. PROJECT_MEMBERS - Membership lookups
-- ============================================
-- Composite index for checking project membership
CREATE INDEX IF NOT EXISTS idx_project_members_project_user
  ON public.project_members (project_id, user_id);

-- ============================================
-- 12. BLOCK_COMMENTS - Inline comment queries
-- ============================================
-- Index for block comment queries by document
CREATE INDEX IF NOT EXISTS idx_block_comments_document
  ON public.block_comments (document_type, document_id);

-- Verify indexes were created
DO $$
BEGIN
  RAISE NOTICE 'Performance indexes migration completed successfully';
END $$;
