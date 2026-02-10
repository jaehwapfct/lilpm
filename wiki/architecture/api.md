# API 설계

> Supabase Client + 9개 Edge Functions 기반 API

## 개요

LilPM은 Supabase를 BaaS(Backend-as-a-Service)로 사용합니다:
- **Database**: PostgreSQL + PostgREST (자동 REST API)
- **Auth**: Supabase Auth (이메일/비밀번호, 매직 링크)
- **Realtime**: Broadcast + Presence
- **Edge Functions**: AI 프록시, 이메일, 초대 수락, MCP 프록시

## 아키텍처

```
┌─────────────────────┐
│     React 컴포넌트   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Zustand Store    │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌──────────┐ ┌──────────┐
│ Service  │ │  lib/api │ ← REST API 클라이언트
│  Layer   │ └──────────┘
└────┬─────┘
     │
     ▼
┌─────────────────────┐
│   Supabase Client   │ ← 직접 쿼리
└──────────┬──────────┘
           │
     ┌─────┴──────────────┐
     ▼                    ▼
┌──────────┐     ┌────────────────┐
│PostgreSQL│     │ Edge Functions │
│ (REST)   │     │  (9개 + _shared)│
└──────────┘     └────────────────┘
```

## Edge Functions 공유 모듈 (`_shared/`)

모든 Edge Functions는 `supabase/functions/_shared/` 디렉토리의 공유 모듈을 사용합니다:

```
supabase/functions/_shared/
├── mod.ts        # 배럴 익스포트 (모든 모듈 re-export)
├── cors.ts       # CORS 헤더 + OPTIONS 핸들링
├── env.ts        # 환경 변수 중앙 관리 (typed getter)
├── supabase.ts   # Admin 클라이언트 팩토리 (Service Role)
├── email.ts      # 이메일 발송 (Gmail SMTP + Resend 폴백)
└── response.ts   # JSON/에러 응답 헬퍼
```

### 사용법

```typescript
import { handleCors, env, createAdminClient, sendGmailEmail, versionedResponse } from '../_shared/mod.ts';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const supabaseAdmin = createAdminClient();
  // ... 비즈니스 로직
  return versionedResponse({ success: true }, FUNCTION_VERSION);
});
```

### 환경 변수 (`env.ts`)

| 변수 | getter | 설명 |
|------|--------|------|
| `SUPABASE_URL` | `env.supabaseUrl` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `env.supabaseServiceKey` | Service Role 키 (RLS 우회) |
| `SITE_URL` | `env.siteUrl` | 프론트엔드 URL (기본: lilpmaiai.vercel.app) |
| `GMAIL_USER` | `env.gmailUser` | Gmail SMTP 사용자 |
| `GMAIL_APP_PASSWORD` | `env.gmailPassword` | Gmail 앱 비밀번호 |
| `RESEND_API_KEY` | `env.resendApiKey` | Resend API 키 (폴백) |
| - | `env.hasGmailConfig` | Gmail 설정 여부 체크 |

### 이메일 발송 (`email.ts`)

```typescript
// Gmail SMTP 직접 발송
const result = await sendGmailEmail(to, subject, htmlContent);

// Resend API 발송 (폴백)
const result = await sendResendEmail(to, subject, htmlContent);

// 자동 폴백 (Gmail → Resend)
const result = await sendEmail(to, subject, htmlContent);
```

### 응답 헬퍼 (`response.ts`)

```typescript
jsonResponse({ data: 'value' })             // 200 JSON
jsonResponse({ data: 'value' }, 201)         // 201 JSON
errorResponse('Something failed', 500)       // 500 에러
versionedResponse({ success: true }, '1.0')  // 버전 포함 응답
versionedError('Failed', '1.0', 400)         // 버전 포함 에러
```

## 서비스 레이어 (Supabase 직접 쿼리)

### 이슈 서비스

```typescript
// features/issues/services/issueService.ts
export async function getIssues(teamId: string, filters?: IssueFilters) {
  let query = supabase
    .from('issues')
    .select(`*, assignee:assignee_id(id, name, email, avatar_url), project:project_id(id, name, color)`)
    .eq('team_id', teamId)
    .is('archived_at', null)  // 아카이브 제외
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.in('status', filters.status);
  if (filters?.priority) query = query.in('priority', filters.priority);
  if (filters?.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
  if (filters?.project_id) query = query.eq('project_id', filters.project_id);
  if (filters?.cycle_id) query = query.eq('cycle_id', filters.cycle_id);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
```

### PRD 서비스

```typescript
// features/prd/services/prdService.ts
getPRDs(teamId) / getPRD(prdId) / createPRD(teamId, data) / updatePRD(prdId, data)
linkToProject(prdId, projectId) / unlinkFromProject(prdId, projectId)
```

### 팀 서비스

```typescript
// lib/services/team/teamService.ts
getTeams() / getTeam(teamId) / createTeam(name, slug) / updateTeam(teamId, data) / deleteTeam(teamId)

// lib/services/team/teamMemberService.ts
getMembers(teamId) / addMember(teamId, userId, role) / removeMember(memberId) / updateMemberRole(memberId, role)

// lib/services/team/teamInviteService.ts
getInvites(teamId) / createInvite(teamId, email, role) / cancelInvite(inviteId) / acceptInvite(token)
```

## Edge Functions (9개)

### accept-invite-v2

초대 수락 처리 (가장 복잡한 Edge Function, `_shared/` 모듈 사용)

```
POST /functions/v1/accept-invite-v2
Body: { token: string, userId?: string }
Response: { success, action, teamId, teamName, userExists, email, magicLinkSent, error, version }
```

**version**: `2026-02-10.2` (공유 모듈 리팩토링)

**사용 공유 모듈**: `handleCors`, `env`, `createAdminClient`, `sendGmailEmail`, `versionedResponse`, `versionedError`

**처리 흐름:**
1. 토큰으로 초대 조회 (Service Role via `createAdminClient()`)
2. 상태/만료 확인 (24시간)
3. 인증 상태별 분기:
   - **CASE A** (userId 제공): 직접 팀 멤버 추가 → invite 상태 accepted → project_ids 기반 프로젝트 할당 정리 → `sendGmailEmail`로 팀원 알림
   - **CASE B** (기존 유저): `supabaseAdmin.auth.admin.generateLink`로 매직 링크 생성 → `sendGmailEmail`로 발송
   - **CASE C** (신규 유저): 회원가입 안내 반환 (`needs_signup`)
4. 모든 이메일은 `sendGmailEmail` 공유 함수 사용 (이전: 인라인 SMTP 코드)

**project_ids 처리:**
```typescript
// invite.project_ids가 있으면
// auto_assign 트리거가 모든 프로젝트에 추가한 후
// project_ids에 없는 프로젝트의 project_members 삭제
if (invite.project_ids?.length > 0) {
  const projectIdsToRemove = teamProjects.filter(id => !selectedSet.has(id));
  await supabaseAdmin.from('project_members').delete()
    .eq('user_id', userId).in('project_id', projectIdsToRemove);
}
```

### lily-chat

AI 채팅 프록시 (멀티 프로바이더, 스트리밍)

```
POST /functions/v1/lily-chat
Body: { messages, provider?, conversationId?, stream?, canvasMode?, mcpTools?, imageData? }
Response: SSE stream 또는 JSON
```

**지원 모델:**
| 프로바이더 | 모델 | 특징 |
|-----------|------|------|
| Anthropic | claude-sonnet-4-20250514 | 코드 분석, 복잡한 추론 |
| OpenAI | gpt-4o | 범용, 빠른 응답 |
| Google | gemini-pro | 멀티모달, 긴 컨텍스트 |
| Lovable | gateway | 폴백 |

**기능:**
- 사용자별 API 키 (`user_ai_settings` 테이블)
- 스트리밍 응답 (SSE)
- Canvas 모드 (HTML 생성)
- MCP 도구 통합
- 멀티모달 (이미지/파일)
- 자동 프로바이더 선택

### mcp-proxy

MCP (Model Context Protocol) 서버 프록시

```
POST /functions/v1/mcp-proxy
Body: { endpoint, apiKey, action, params? }
Response: JSON (MCP 서버 응답)
```

### get-invite-preview

비인증 유저의 초대 미리보기 (Service Role로 RLS 우회)

```
POST /functions/v1/get-invite-preview
Body: { token: string }
Response: { valid, status, teamName, inviterName, inviterAvatar, email }
```

### send-team-invite

팀 초대 이메일 발송 (Gmail SMTP)

```
POST /functions/v1/send-team-invite
Body: { email, teamName, inviterName, inviteUrl, isExistingUser }
```
- 기존 유저 → 인앱 알림도 생성 (`notifications` INSERT)
- 프로젝트별 초대 URL 지원

### send-mention-email

@멘션 이메일 발송 (Gmail SMTP)

```
POST /functions/v1/send-mention-email
Body: { recipientEmail, mentionerName, prdId, prdTitle }
```

### send-notification-email

7가지 알림 유형 이메일 (Gmail SMTP)

```
POST /functions/v1/send-notification-email
Body: { recipientId, recipientEmail, recipientName, type, data }
```

알림 유형: `issue_assigned`, `issue_mentioned`, `comment_added`, `due_date_reminder`, `status_changed`, `team_invite`, `prd_mentioned`

### send-member-removed

멤버 제거 알림 이메일 (Resend API / Gmail SMTP 폴백)

```
POST /functions/v1/send-member-removed
Body: { email, memberName, teamName, removedByName }
```

### delete-users

유저 완전 삭제 (13개 테이블 순차 삭제)

```
POST /functions/v1/delete-users
Body: { user_ids: string[] }
Response: { results: [{ userId, success, errors }] }
```

삭제 순서:
1. user_ai_settings → 2. prd_documents → 3. prd_projects → 4. team_members
5. team_invites (SET NULL) → 6. issues (SET NULL) → 7. activity_logs
8. notifications → 9. conversation_access_requests → 10. conversation_shares
11. conversations (CASCADE → messages) → 12. profiles → 13. auth.users

## 실시간 구독

### Supabase Realtime

```typescript
// 팀 멤버 변경 구독
const channel = supabase
  .channel(`team_members:${teamId}`)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'team_members',
    filter: `team_id=eq.${teamId}`,
  }, (payload) => handleMemberChange(payload))
  .subscribe();

// Presence (협업 커서)
const channel = supabase.channel(`collab:prd:${prdId}`, {
  config: { presence: { key: userId } }
});
channel.on('presence', { event: 'sync' }, () => { ... });
channel.on('broadcast', { event: 'content_change' }, ({ payload }) => { ... });
```

## 타입 정의

```typescript
// types/index.ts
export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done' | 'cancelled';
export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export type IssueType = 'epic' | 'user_story' | 'task' | 'subtask' | 'bug';
export type TeamRole = 'owner' | 'admin' | 'member' | 'guest';
export type ProjectMemberRole = 'lead' | 'member' | 'viewer';
export type PRDStatus = 'draft' | 'in_review' | 'approved' | 'archived';
export type CycleStatus = 'upcoming' | 'active' | 'completed';
```

## 에러 처리

```typescript
// 공통 Supabase 에러 코드
PGRST116 → 레코드 없음
23505    → 중복 키 (이미 존재)
42501    → RLS 권한 부족
23503    → FK 위반
```

---

**관련 문서**
- [프론트엔드 아키텍처](./frontend.md)
- [데이터베이스 스키마](./database.md)
- [서비스 레이어](./services.md)
