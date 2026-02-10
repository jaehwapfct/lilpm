---
name: Edge Function Development
description: Supabase Edge Function (Deno) 개발 전문. CORS, 인증, 에러 처리, 테스트, 배포. Edge Function 작성/수정 시 즉시 사용.
---

# Edge Function Development Skill

## 프로젝트 Edge Functions 목록

| 함수 | 경로 | 용도 |
|------|------|------|
| lily-chat | `supabase/functions/lily-chat/` | AI 채팅 프록시 |
| mcp-proxy | `supabase/functions/mcp-proxy/` | MCP 프록시 |
| send-team-invite | `supabase/functions/send-team-invite/` | 초대 이메일 |
| accept-invite-v2 | `supabase/functions/accept-invite-v2/` | 초대 수락 |
| get-invite-preview | `supabase/functions/get-invite-preview/` | 초대 미리보기 |
| send-mention-email | `supabase/functions/send-mention-email/` | @멘션 알림 |
| send-notification-email | `supabase/functions/send-notification-email/` | 일반 알림 |
| delete-users | `supabase/functions/delete-users/` | 사용자 삭제 |
| send-member-removed | `supabase/functions/send-member-removed/` | 멤버 삭제 알림 |

## 기본 템플릿

```typescript
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 인증 확인
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 사용자 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 비즈니스 로직
    const body = await req.json();
    // ... 처리 ...

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## CORS 설정

```typescript
// supabase/functions/_shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
```

## Service Role 사용 (관리자 작업)

```typescript
// 서비스 롤 클라이언트 (RLS 우회)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

> [!CAUTION]
> Service Role은 RLS를 완전히 우회합니다. 반드시 서버 사이드에서만 사용하고,
> 사용자 입력은 항상 검증 후 사용하세요.

## Deno 특화 주의사항

### npm 패키지 임포트
```typescript
// Deno에서 npm 패키지 사용
import Anthropic from 'npm:@anthropic-ai/sdk';
import { Resend } from 'npm:resend';
```

### 환경변수
```typescript
// Deno.env.get() 사용 (process.env 아님!)
const apiKey = Deno.env.get('API_KEY');
```

### Supabase 자동 제공 변수
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

## 테스트 패턴 (브라우저 없이)

### curl로 직접 테스트
```bash
# 로컬 테스트
curl -X POST http://localhost:54321/functions/v1/function-name \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# 원격 테스트
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/function-name \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### 단위 테스트 (Deno.test)
```typescript
import { assertEquals } from 'https://deno.land/std/assert/mod.ts';

Deno.test('should validate invite token', () => {
  const result = validateToken('valid-token');
  assertEquals(result.valid, true);
});
```

## 배포

### 단일 함수 배포
```bash
supabase functions deploy function-name --no-verify-jwt
```

### 전체 배포
```bash
# CI/CD에서 자동 배포됨
# 수동 배포 시:
supabase functions deploy lily-chat --no-verify-jwt
supabase functions deploy accept-invite-v2 --no-verify-jwt
# ... 기타 함수들
```

### 환경변수 설정
```bash
supabase secrets set API_KEY=your-key
supabase secrets list
```

## 에러 처리 체크리스트

- [ ] CORS preflight (OPTIONS) 처리
- [ ] Authorization 헤더 검증
- [ ] 사용자 토큰 검증 (getUser)
- [ ] 입력 데이터 검증
- [ ] try-catch로 전체 감싸기
- [ ] 의미있는 에러 메시지 반환
- [ ] 적절한 HTTP 상태 코드
- [ ] console.error로 서버 로그

## delete-users 함수 업데이트 규칙

새 테이블 추가 시 반드시 확인:
1. `user_id` 참조 → `delete-users/index.ts`에 테이블 추가
2. FK 규칙: `user_id` → CASCADE, `created_by/assigned_to` → SET NULL
3. 재배포: `supabase functions deploy delete-users --no-verify-jwt`
