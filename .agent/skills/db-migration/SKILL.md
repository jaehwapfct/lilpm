---
name: Database Migration
description: 마이그레이션 작성, FK 규칙, RLS 패턴, Edge Function 가이드
---

# Database Migration Skill

## 사용 시나리오
- 새 테이블 생성
- FK 제약조건 수정
- RLS 정책 추가
- Edge Function 작성

## ⚠️ CRITICAL: FK 규칙

### 필수 규칙
```sql
-- 유저 신원 (CASCADE)
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE

-- 소유권/할당 (SET NULL)
created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL
invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
```

### 선택 가이드
| 컬럼 타입 | 액션 | 예시 |
|----------|------|------|
| user_id | CASCADE | profiles, notifications |
| created_by | SET NULL | issues, projects, prds |
| assigned_to | SET NULL | issues |
| owner_id | SET NULL 또는 CASCADE | teams, conversations |

## 마이그레이션 템플릿

```sql
-- ============================================================================
-- Migration: [목적]
-- Created: [날짜]
-- ============================================================================

-- 테이블 생성
CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- RLS 정책 (팀 멤버만)
CREATE POLICY "Team members can access" ON my_table
  FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_my_table_team_id ON my_table(team_id);
```

## RLS 정책 패턴

### 팀 멤버 접근
```sql
CREATE POLICY "Team members only" ON [TABLE]
  FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );
```

### 본인만 접근
```sql
CREATE POLICY "Own records only" ON [TABLE]
  FOR ALL USING (user_id = auth.uid());
```

### 관리자 + 생성자
```sql
CREATE POLICY "Creator or admin" ON [TABLE]
  FOR ALL USING (
    created_by = auth.uid() OR
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

## Edge Function 템플릿

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    
    // 로직 구현

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

## 배포 명령어

```bash
# JWT 검증 필요
supabase functions deploy [function-name]

# 비인증 접근 허용
supabase functions deploy [function-name] --no-verify-jwt
```

## 체크리스트

### 새 테이블 생성 시
- [ ] FK에 ON DELETE CASCADE/SET NULL 명시
- [ ] RLS 활성화 및 정책 추가
- [ ] 필요한 인덱스 생성
- [ ] delete-users Edge Function 업데이트 필요 여부 확인

### Edge Function 작성 시
- [ ] CORS 헤더 포함
- [ ] 에러 핸들링
- [ ] 환경 변수 사용 (하드코딩 금지)
- [ ] 배포 전 로컬 테스트
