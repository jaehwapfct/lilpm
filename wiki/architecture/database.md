# 🗄️ 데이터베이스 스키마

> Supabase PostgreSQL 기반 데이터 모델

## ERD 개요

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │────<│ team_members│>────│   teams     │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                    │
      │                   ↓                    │
      │            ┌─────────────┐             │
      │            │team_invites │             │
      │            └─────────────┘             │
      │                                        ▼
┌─────────────┐                         ┌─────────────┐
│user_settings│                         │  projects   │
└─────────────┘                         └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────┐
                    ▼                         ▼                 ▼
             ┌─────────────┐          ┌─────────────┐    ┌─────────────┐
             │   issues    │──────────│    prds     │    │   cycles    │
             └─────────────┘          └─────────────┘    └─────────────┘
                    │                        │
          ┌────────┼────────┐               ▼
          ▼        │        ▼        ┌─────────────┐
┌─────────────┐    │  ┌─────────────┐│ prd_projects│
│dependencies │    │  │notifications│└─────────────┘
└─────────────┘    │  └─────────────┘
                   ▼
            ┌─────────────┐
            │  comments   │
            └─────────────┘
```

## 주요 테이블

### users (Supabase Auth)

Supabase Auth에서 관리하는 사용자 테이블

```sql
-- auth.users (Supabase 관리)
id UUID PRIMARY KEY
email TEXT UNIQUE
email_confirmed_at TIMESTAMPTZ
raw_user_meta_data JSONB  -- { name: string }
created_at TIMESTAMPTZ
```

### profiles

사용자 프로필 (auth.users 미러)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 트리거로 auth.users와 자동 동기화
```

### teams

팀/워크스페이스

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  issue_prefix TEXT,  -- 이슈 번호 접두사 (예: LPM)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### team_members

팀 멤버십 (다대다 관계)

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'guest')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);
```

### team_invites

팀 초대

```sql
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'member', 'guest')) DEFAULT 'member',
  token TEXT UNIQUE NOT NULL,  -- 초대 토큰 (UUID)
  status TEXT CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')) DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,  -- 생성 후 24시간
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_team_invites_token ON team_invites(token);
CREATE INDEX idx_team_invites_email ON team_invites(email);
```

### projects

프로젝트

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,  -- 이모지 아이콘
  color TEXT DEFAULT '#6366f1',
  status TEXT CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### issues

이슈/티켓

```sql
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  cycle_id UUID REFERENCES cycles(id) ON DELETE SET NULL,
  prd_id UUID REFERENCES prd_documents(id) ON DELETE SET NULL,  -- 연결된 PRD
  parent_id UUID REFERENCES issues(id) ON DELETE CASCADE,  -- 상위 이슈
  
  -- 식별자
  identifier TEXT,  -- 예: LPM-123
  
  -- 기본 정보
  title TEXT NOT NULL,
  description TEXT,
  
  -- 타입
  type TEXT CHECK (type IN ('epic', 'user_story', 'task', 'subtask', 'bug')) DEFAULT 'task',
  
  -- 상태 (blocked 추가됨)
  status TEXT CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'cancelled')) DEFAULT 'backlog',
  priority TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low', 'none')) DEFAULT 'none',
  
  -- 담당
  assignee_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES auth.users(id),
  
  -- 일정
  start_date DATE,
  due_date DATE,
  estimate INTEGER,  -- 스토리 포인트
  
  -- 정렬
  sort_order FLOAT,
  
  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_issues_team ON issues(team_id);
CREATE INDEX idx_issues_project ON issues(project_id);
CREATE INDEX idx_issues_cycle ON issues(cycle_id);
CREATE INDEX idx_issues_prd ON issues(prd_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_assignee ON issues(assignee_id);
```

### cycles

사이클/스프린트

```sql
CREATE TABLE cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### prd_documents

PRD 문서

```sql
CREATE TABLE prd_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  content TEXT,  -- TipTap JSON 또는 HTML
  
  status TEXT CHECK (status IN ('draft', 'in_review', 'approved', 'archived')) DEFAULT 'draft',
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### prd_projects

PRD-프로젝트 다대다 연결

```sql
CREATE TABLE prd_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id UUID REFERENCES prd_documents(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prd_id, project_id)
);
```

### notifications

알림 (인박스용)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),  -- 알림 발생시킨 유저
  
  type TEXT NOT NULL,  -- prd_mentioned, issue_assigned, etc.
  title TEXT NOT NULL,
  message TEXT,
  
  entity_type TEXT,  -- prd, issue, team, etc.
  entity_id UUID,
  data JSONB,  -- 추가 데이터
  
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
```

### dependencies

이슈 간 의존성

```sql
CREATE TABLE dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocking_issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  blocked_issue_id UUID REFERENCES issues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocking_issue_id, blocked_issue_id)
);
```

### user_settings

사용자 설정 (AI 키 포함)

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- AI 설정
  anthropic_api_key TEXT,
  openai_api_key TEXT,
  gemini_api_key TEXT,
  default_provider TEXT DEFAULT 'auto',
  auto_mode_enabled BOOLEAN DEFAULT true,
  
  -- 기타 설정
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'ko',
  
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### conversations

Lily 대화 기록

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  title TEXT,
  messages JSONB DEFAULT '[]',
  is_pinned BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## RPC 함수

### create_team_with_owner

팀 생성 시 생성자를 Owner로 자동 추가:

```sql
-- supabase/migrations/20260207115000_fix_create_team_with_owner.sql
CREATE OR REPLACE FUNCTION create_team_with_owner(
  _name text,
  _slug text,
  _issue_prefix text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_team_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- 팀 생성
  INSERT INTO teams (name, slug, issue_prefix, created_at, updated_at)
  VALUES (_name, _slug, COALESCE(_issue_prefix, UPPER(LEFT(_slug, 3))), NOW(), NOW())
  RETURNING id INTO new_team_id;

  -- 생성자를 Owner로 추가
  INSERT INTO team_members (team_id, user_id, role, joined_at)
  VALUES (new_team_id, current_user_id, 'owner', NOW())
  ON CONFLICT (team_id, user_id) DO UPDATE SET role = 'owner';

  RETURN json_build_object('id', new_team_id, 'name', _name, 'slug', _slug);
END;
$$;
```

## Row Level Security (RLS)

모든 테이블에 RLS 적용:

```sql
-- 팀 멤버만 접근 가능
CREATE POLICY "Team members can access" ON issues
  FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- 본인 설정만 접근
CREATE POLICY "Users can access own settings" ON user_settings
  FOR ALL
  USING (user_id = auth.uid());

-- 본인 알림만 접근
CREATE POLICY "Users can access own notifications" ON notifications
  FOR ALL
  USING (user_id = auth.uid());
```

## Edge Functions

| 함수명 | 용도 | JWT 검증 |
|--------|------|----------|
| `get-invite-preview` | 초대 미리보기 (RLS 우회) | ❌ |
| `send-team-invite` | 팀 초대 이메일 발송 | ✅ |
| `send-mention-email` | @멘션 이메일 발송 | ✅ |
| `lily-chat` | Lily AI 채팅 | ✅ |

## 마이그레이션

### 20260207115700_add_prd_id_to_issues.sql

```sql
-- issues 테이블에 prd_id 컬럼 추가
ALTER TABLE issues ADD COLUMN IF NOT EXISTS prd_id UUID REFERENCES prd_documents(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_issues_prd ON issues(prd_id);
```

## 인덱스 전략

```sql
-- 자주 사용하는 쿼리 패턴
CREATE INDEX idx_issues_team_status ON issues(team_id, status);
CREATE INDEX idx_issues_assignee ON issues(assignee_id);
CREATE INDEX idx_issues_dates ON issues(start_date, due_date);
CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_invites_token ON team_invites(token);
```

---

**관련 문서**
- [프론트엔드 아키텍처](./frontend.md)
- [API 설계](./api.md)
- [팀 멤버 관리](../features/team-members.md)
