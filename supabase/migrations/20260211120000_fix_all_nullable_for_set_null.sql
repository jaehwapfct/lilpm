-- ============================================================================
-- Migration: Make ALL user-reference columns nullable that need ON DELETE SET NULL
-- ============================================================================
-- Explicit fix for every column that references auth.users with SET NULL behavior.
-- If the column is NOT NULL, SET NULL will fail, blocking user deletion.
-- ============================================================================

-- Fix all known columns explicitly
DO $$
DECLARE
  cols TEXT[][] := ARRAY[
    -- [table, column]
    ARRAY['issues', 'creator_id'],
    ARRAY['issues', 'assignee_id'],
    ARRAY['prd_documents', 'created_by'],
    ARRAY['teams', 'created_by'],
    ARRAY['teams', 'owner_id'],
    ARRAY['team_invites', 'invited_by'],
    ARRAY['projects', 'lead_id'],
    ARRAY['projects', 'created_by'],
    ARRAY['comments', 'user_id'],
    ARRAY['activities', 'user_id'],
    ARRAY['activity_logs', 'user_id'],
    ARRAY['activity_logs', 'target_user_id'],
    ARRAY['issue_dependencies', 'created_by'],
    ARRAY['prd_versions', 'created_by'],
    ARRAY['prd_versions', 'author_id'],
    ARRAY['prd_yjs_state', 'updated_by'],
    ARRAY['issue_templates', 'created_by'],
    ARRAY['issue_versions', 'created_by'],
    ARRAY['issue_versions', 'author_id'],
    ARRAY['conversation_access_requests', 'responded_by'],
    ARRAY['databases', 'created_by'],
    ARRAY['database_rows', 'created_by'],
    ARRAY['block_comments', 'author_id'],
    ARRAY['block_comments', 'resolved_by'],
    ARRAY['block_comment_replies', 'author_id'],
    ARRAY['project_members', 'assigned_by']
  ];
  tbl TEXT;
  col TEXT;
  fix_count INT := 0;
BEGIN
  FOR i IN 1..array_length(cols, 1) LOOP
    tbl := cols[i][1];
    col := cols[i][2];
    
    -- Check if table and column exist AND column is NOT NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = col
      AND is_nullable = 'NO'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP NOT NULL', tbl, col);
      RAISE NOTICE 'Fixed %.% → nullable', tbl, col;
      fix_count := fix_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total columns fixed: %', fix_count;
END $$;
