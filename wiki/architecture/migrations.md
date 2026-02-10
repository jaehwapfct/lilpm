# Database Migrations Guide

## Overview
LilPM uses Supabase migrations to manage database schema changes. Migrations are in `supabase/migrations/` (active) and `supabase/migrations-archive/` (historical).

## Migration Categories

### CORE (Initial Schema)
| File | Description |
|------|-------------|
| 20240205_create_issue_dependencies.sql | Issue dependency tracking (Gantt links) |

### FK CASCADE (User Deletion)
Ensures proper cascading when users are deleted from auth.users.

| File | Description |
|------|-------------|
| 20260206131000_user_deletion_cascade.sql | Initial CASCADE setup |
| 20260207011300_comprehensive_user_cascade.sql | All tables FK update |
| 20260207013500_fix_all_user_fk_dynamic.sql | Dynamic FK repair |
| 20260207015000_user_deletion_trigger.sql | Trigger-based cleanup |
| 20260207020000_nullable_creator_ids.sql | Allow NULL on creator columns |

**Rule**: `user_id` → CASCADE, `created_by/assigned_to/creator_id/assignee_id` → SET NULL

### FEATURES (New Functionality)
| File | Description |
|------|-------------|
| 20260205223000_create_notifications_table.sql | User notifications |
| 20260206153000_create_activity_logs.sql | Activity tracking |
| 20260206231500_create_prd_versions.sql | PRD version history |
| 20260206233300_create_prd_yjs_state.sql | Collaborative editing state (Yjs BYTEA) |
| 20260207020500_issue_templates.sql | Issue templates |
| 20260207200300_conversation_shares.sql | Shareable Lily conversations |
| 20260208170700_archive_system.sql | Archive system (archived_at, 30-day retention) |
| 20260208171500_create_databases.sql | Notion-style database (4 tables) |
| 20260208171600_page_versions_and_comments.sql | Block comments + versions |
| 20260208190000_project_members.sql | Per-project access control + RLS |
| 20260210150000_invite_project_ids.sql | project_ids on team_invites |
| 20260210160000_performance_indexes.sql | 15+ 성능 인덱스 (notifications, activities, issues, database_rows 등) |
| 20260210160000_database_enhancements.sql | Sub-items (parent_id, position), rollup config |
| 20260210170000_block_comment_reactions.sql | Emoji reactions on block comments |

### RLS (Row Level Security)
| File | Description |
|------|-------------|
| 20260206161100_fix_team_invites_rls.sql | Invite visibility by token |
| 20260206162500_fix_team_members_rls.sql | Member access for invite acceptance |
| 20260206162900_fix_rls_recursion.sql | Fix infinite recursion with SECURITY DEFINER |
| 20260208200500_fix_rls_policy_recursion.sql | Fix project RLS recursion |

### FIXES (Bug Fixes)
| File | Description |
|------|-------------|
| 20260205215500_fix_prd_and_settings.sql | PRD content + user_ai_settings |
| 20260205221000_fix_relationships_and_data.sql | FK + default data |
| 20260206154700_invite_expiration.sql | 24-hour expiration trigger |
| 20260207014200_prd_project_relationship.sql | prd_projects join table |
| 20260207115000_fix_create_team_with_owner.sql | RPC function fix |
| 20260207115700_add_prd_id_to_issues.sql | Issue-PRD link |
| 20260207121500_fix_existing_team_owners.sql | Owner migration |
| 20260207192000_get_invite_preview_rpc.sql | Invite preview RPC |
| 20260207193000_fix_invite_preview_rpc.sql | RPC parameter fix |
| 20260208011500_fix_teams_without_owner.sql | Ensure owner exists |

---

## Creating New Migrations

### Naming Convention
```
YYYYMMDDHHMMSS_descriptive_name.sql
```

### FK Reference Rules
```sql
-- User identity (CASCADE) - 유저 삭제 시 관련 데이터 함께 삭제
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE

-- Ownership/assignment (SET NULL) - 유저 삭제 시 NULL (데이터 보존)
created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL
creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
```

### Template
```sql
-- ============================================================================
-- Migration: [Purpose]
-- Created: [Date]
-- ============================================================================

CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can access" ON my_table
  FOR ALL USING (is_team_member_safe(team_id, auth.uid()));

CREATE INDEX IF NOT EXISTS idx_my_table_team_id ON my_table(team_id);
```

## Edge Functions (9 Active)

| Function | Purpose | Auth |
|----------|---------|------|
| accept-invite-v2 | Invite acceptance (auth/magic-link/signup, project assignment) | None |
| delete-users | User account deletion (13 tables cascade) | None |
| get-invite-preview | Public invite info (Service Role) | None |
| lily-chat | AI conversation (Claude/GPT-4o/Gemini, streaming) | None |
| mcp-proxy | MCP server proxy | None |
| send-member-removed | Member removal email | None |
| send-mention-email | @mention email alerts | None |
| send-notification-email | 7-type notification emails | None |
| send-team-invite | Invite emails + in-app notifications | None |

## Deployment Commands

```bash
# 마이그레이션 적용
supabase db push

# Edge Function 배포 (개별)
supabase functions deploy accept-invite-v2 --no-verify-jwt
supabase functions deploy lily-chat --no-verify-jwt

# Edge Function 배포 (전체)
supabase functions deploy --no-verify-jwt
```

---

**관련 문서**
- [데이터베이스 스키마](./database.md)
- [API 설계](./api.md)
