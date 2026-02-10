-- ============================================================================
-- Migration: Fix NOT NULL columns that have ON DELETE SET NULL FK constraints
-- ============================================================================
-- Problem: Some columns (like issues.creator_id) are NOT NULL but their FK
-- constraint uses ON DELETE SET NULL. This is contradictory - when the 
-- referenced user is deleted, Postgres tries to SET NULL but the NOT NULL
-- constraint blocks it.
--
-- Solution: Make these columns nullable.
-- ============================================================================

-- 1. Fix issues.creator_id specifically (known blocker)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issues' AND column_name = 'creator_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE issues ALTER COLUMN creator_id DROP NOT NULL;
    RAISE NOTICE 'Fixed issues.creator_id → now nullable';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error fixing issues.creator_id: %', SQLERRM;
END $$;

-- 2. Dynamic catchall: Fix ALL columns that are NOT NULL + ON DELETE SET NULL
DO $$
DECLARE
  r RECORD;
  fix_count INT := 0;
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
    RAISE NOTICE 'Fixing NOT NULL + SET NULL conflict: %.%', r.table_name, r.column_name;
    EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I DROP NOT NULL', r.table_schema, r.table_name, r.column_name);
    fix_count := fix_count + 1;
  END LOOP;

  IF fix_count > 0 THEN
    RAISE NOTICE 'Fixed % columns with NOT NULL + ON DELETE SET NULL conflict', fix_count;
  ELSE
    RAISE NOTICE 'No NOT NULL + ON DELETE SET NULL conflicts found';
  END IF;
END $$;
