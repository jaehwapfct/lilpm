# Database Migrations Guide

## Overview
LilPM uses Supabase migrations to manage database schema changes. This document explains the migration history and best practices for future development.

## Migration Categories

### 🟢 CORE (Initial Schema)
Base tables and relationships.

| File | Description |
|------|-------------|
| 20240205_create_issue_dependencies.sql | Issue dependency tracking |

---

### 🔵 FK CASCADE (User Deletion)
Ensures proper cascading when users are deleted from auth.users.

| File | Description |
|------|-------------|
| 20260206131000_user_deletion_cascade.sql | Initial cascade setup |
| 20260207011300_comprehensive_user_cascade.sql | All tables FK update |
| 20260207013500_fix_all_user_fk_dynamic.sql | Dynamic FK repair |
| 20260207015000_user_deletion_trigger.sql | Trigger-based cleanup |
| 20260207020000_nullable_creator_ids.sql | Allow NULL on creator columns |

**Rule**: All `user_id` → `CASCADE`, all `created_by/assigned_to` → `SET NULL`

---

### 🟡 FEATURES (New Functionality)

| File | Description |
|------|-------------|
| 20260205223000_create_notifications_table.sql | User notifications |
| 20260206153000_create_activity_logs.sql | Activity tracking |
| 20260206231500_create_prd_versions.sql | PRD version history |
| 20260206233300_create_prd_yjs_state.sql | Collaborative editing state |
| 20260207020500_issue_templates.sql | Issue templates |
| 20260207200300_conversation_shares.sql | Shareable Lily conversations |

---

### 🟠 RLS (Row Level Security)

| File | Description |
|------|-------------|
| 20260206161100_fix_team_invites_rls.sql | Invite visibility |
| 20260206162500_fix_team_members_rls.sql | Member access |
| 20260206162900_fix_rls_recursion.sql | Recursive CTE fix |

---

### 🔴 FIXES (Bug Fixes)

| File | Description |
|------|-------------|
| 20260205215500_fix_prd_and_settings.sql | PRD/settings fixes |
| 20260205221000_fix_relationships_and_data.sql | Data integrity |
| 20260206154700_invite_expiration.sql | Expiration logic |
| 20260207014200_prd_project_relationship.sql | PRD-Project link |
| 20260207115000_fix_create_team_with_owner.sql | Team creation |
| 20260207115700_add_prd_id_to_issues.sql | Issue-PRD link |
| 20260207121500_fix_existing_team_owners.sql | Owner migration |
| 20260207192000_get_invite_preview_rpc.sql | Invite preview RPC |
| 20260207193000_fix_invite_preview_rpc.sql | RPC fix |

---

## Creating New Migrations

### Naming Convention
```
YYYYMMDDHHMMSS_descriptive_name.sql
```

### FK Reference Rules
```sql
-- User identity tables (CASCADE)
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE

-- Ownership/assignment (SET NULL)
created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL
```

### Required Elements
1. Clear header comment explaining purpose
2. Proper FK constraints with DELETE action
3. RLS policies if exposing data
4. Indexes for frequently queried columns

### Example Template
```sql
-- ============================================================================
-- Migration: [Purpose]
-- Created: [Date]
-- ============================================================================

-- Create table
CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Team members can access" ON my_table
  FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_my_table_team_id ON my_table(team_id);
```

## Edge Functions (7 Active)

| Function | Purpose | Auth |
|----------|---------|------|
| delete-users | User account deletion | JWT |
| get-invite-preview | Public invite info | None |
| lily-chat | AI conversation | JWT |
| mcp-proxy | MCP server proxy | JWT |
| send-member-removed | Email notification | JWT |
| send-mention-email | Mention alerts | JWT |
| send-team-invite | Invite emails | JWT |
