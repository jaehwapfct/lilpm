-- ============================================================================
-- DIAGNOSTIC SCRIPT: Run this in Supabase SQL Editor to find the problem
-- ============================================================================

-- 1. Find ALL foreign key constraints that reference auth.users
SELECT 
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  rc.delete_rule,
  tc.constraint_name
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
ORDER BY tc.table_schema, tc.table_name;

-- 2. Check if the trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_deleted';

-- 3. Check the function exists
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_user_deletion';
