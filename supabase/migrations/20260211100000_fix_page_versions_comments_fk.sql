-- ============================================================================
-- Migration: Fix missing ON DELETE clauses for page_versions_and_comments tables
-- ============================================================================
-- The 20260208171600_page_versions_and_comments migration created several FK
-- constraints referencing auth.users(id) WITHOUT ON DELETE clauses.
-- PostgreSQL defaults to NO ACTION (= RESTRICT), which blocks user deletion.
--
-- This migration fixes those constraints AND runs a dynamic catchall to fix
-- any other FK constraints that may have been missed.
-- ============================================================================

-- 1. prd_versions.author_id -> ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prd_versions' AND column_name = 'author_id'
  ) THEN
    -- Make column nullable first (it was NOT NULL)
    ALTER TABLE prd_versions ALTER COLUMN author_id DROP NOT NULL;
    
    ALTER TABLE prd_versions DROP CONSTRAINT IF EXISTS prd_versions_author_id_fkey;
    ALTER TABLE prd_versions ADD CONSTRAINT prd_versions_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Fixed prd_versions.author_id FK → ON DELETE SET NULL';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing prd_versions.author_id: %', SQLERRM;
END $$;

-- 2. issue_versions.author_id -> ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issue_versions' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE issue_versions ALTER COLUMN author_id DROP NOT NULL;
    
    ALTER TABLE issue_versions DROP CONSTRAINT IF EXISTS issue_versions_author_id_fkey;
    ALTER TABLE issue_versions ADD CONSTRAINT issue_versions_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Fixed issue_versions.author_id FK → ON DELETE SET NULL';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing issue_versions.author_id: %', SQLERRM;
END $$;

-- 3. block_comments.author_id -> ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'block_comments' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE block_comments ALTER COLUMN author_id DROP NOT NULL;
    
    ALTER TABLE block_comments DROP CONSTRAINT IF EXISTS block_comments_author_id_fkey;
    ALTER TABLE block_comments ADD CONSTRAINT block_comments_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Fixed block_comments.author_id FK → ON DELETE SET NULL';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing block_comments.author_id: %', SQLERRM;
END $$;

-- 4. block_comments.resolved_by -> ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'block_comments' AND column_name = 'resolved_by'
  ) THEN
    ALTER TABLE block_comments DROP CONSTRAINT IF EXISTS block_comments_resolved_by_fkey;
    ALTER TABLE block_comments ADD CONSTRAINT block_comments_resolved_by_fkey
      FOREIGN KEY (resolved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Fixed block_comments.resolved_by FK → ON DELETE SET NULL';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing block_comments.resolved_by: %', SQLERRM;
END $$;

-- 5. block_comment_replies.author_id -> ON DELETE SET NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'block_comment_replies' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE block_comment_replies ALTER COLUMN author_id DROP NOT NULL;
    
    ALTER TABLE block_comment_replies DROP CONSTRAINT IF EXISTS block_comment_replies_author_id_fkey;
    ALTER TABLE block_comment_replies ADD CONSTRAINT block_comment_replies_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    RAISE NOTICE 'Fixed block_comment_replies.author_id FK → ON DELETE SET NULL';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing block_comment_replies.author_id: %', SQLERRM;
END $$;

-- 6. Fix NOT NULL columns that have ON DELETE SET NULL (contradictory)
-- issues.creator_id is NOT NULL but FK is ON DELETE SET NULL → make nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issues' AND column_name = 'creator_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE issues ALTER COLUMN creator_id DROP NOT NULL;
    RAISE NOTICE 'Fixed issues.creator_id → now nullable (required for ON DELETE SET NULL)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing issues.creator_id nullable: %', SQLERRM;
END $$;

-- Fix any other columns that are NOT NULL but have ON DELETE SET NULL
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    JOIN information_schema.columns AS c
      ON c.table_schema = tc.table_schema AND c.table_name = tc.table_name AND c.column_name = kcu.column_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
      AND tc.table_schema = 'public'
      AND rc.delete_rule = 'SET NULL'
      AND c.is_nullable = 'NO'
  LOOP
    RAISE NOTICE 'Found NOT NULL column with ON DELETE SET NULL: %.% - fixing', r.table_name, r.column_name;
    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I DROP NOT NULL', r.table_schema, r.table_name, r.column_name);
  END LOOP;
END $$;

-- 7. CATCHALL: Dynamically fix ANY remaining FK constraints to auth.users without proper ON DELETE
DO $$
DECLARE
  r RECORD;
  new_action TEXT;
BEGIN
  FOR r IN
    SELECT
      tc.constraint_name,
      tc.table_schema,
      tc.table_name,
      kcu.column_name,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
      AND tc.table_schema = 'public'
      AND rc.delete_rule NOT IN ('CASCADE', 'SET NULL')
  LOOP
    RAISE NOTICE 'Catchall: Found FK without proper ON DELETE: %.% column % (current: %)',
      r.table_name, r.constraint_name, r.column_name, r.delete_rule;

    -- profiles.id and user_id columns should CASCADE, everything else SET NULL
    IF r.table_name = 'profiles' AND r.column_name = 'id' THEN
      new_action := 'CASCADE';
    ELSIF r.column_name = 'user_id' THEN
      new_action := 'CASCADE';
    ELSE
      new_action := 'SET NULL';
    END IF;

    -- Make column nullable if needed for SET NULL
    IF new_action = 'SET NULL' THEN
      BEGIN
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I DROP NOT NULL',
          r.table_schema, r.table_name, r.column_name);
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Column might already be nullable
      END;
    END IF;

    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I',
      r.table_schema, r.table_name, r.constraint_name);

    EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE %s',
      r.table_schema, r.table_name, r.constraint_name, r.column_name, new_action);

    RAISE NOTICE 'Catchall: Updated %.% → ON DELETE %', r.table_name, r.constraint_name, new_action;
  END LOOP;
END $$;

-- 7. Verification: List any remaining problematic constraints
DO $$
DECLARE
  count_bad INT;
BEGIN
  SELECT COUNT(*) INTO count_bad
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
  JOIN information_schema.referential_constraints AS rc ON rc.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'auth'
    AND ccu.table_name = 'users'
    AND tc.table_schema = 'public'
    AND rc.delete_rule NOT IN ('CASCADE', 'SET NULL');

  IF count_bad > 0 THEN
    RAISE WARNING 'Still found % FK constraints without proper ON DELETE action!', count_bad;
  ELSE
    RAISE NOTICE 'All FK constraints to auth.users now have proper ON DELETE actions.';
  END IF;
END $$;
