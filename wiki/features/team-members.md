# 👥 팀 멤버 관리

> 팀 멤버 초대, 권한 관리, 실시간 동기화

## 개요

LilPM은 팀 기반 협업 도구로, 멤버 초대 및 권한 관리를 지원합니다. 멤버 변경 사항은 **실시간으로 모든 팀원에게 동기화**됩니다.

## 팀 역할

| 역할 | 설명 | 권한 |
|------|------|------|
| **Owner** | 팀 생성자 | 모든 권한, 팀 삭제, 소유권 이전 |
| **Admin** | 관리자 | 멤버 초대/제거, 설정 변경 |
| **Member** | 일반 멤버 | 이슈/PRD 생성 및 편집 |

## 멤버 초대 플로우

```
┌─────────────────┐
│  관리자가 초대   │
│ (이메일 입력)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐    기존 유저?    ┌─────────────────┐
│ Edge Function   │ ──── YES ──────→│ 인앱 알림 발송   │
│ send-team-invite│                 └─────────────────┘
└────────┬────────┘
         │ NO
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 초대 이메일 발송 │ ──→ │ 회원가입 링크    │
└─────────────────┘     │ /invite/accept  │
                        └─────────────────┘
```

## 주요 기능

### 1. 멤버 초대

```typescript
// teamService.ts
const { data, error } = await supabase.functions.invoke('send-team-invite', {
  body: {
    inviteId,
    email,
    teamName,
    inviterName,
    role,
    token,
    isExistingUser,
    targetUserId,
  },
});
```

- **신규 유저**: 이메일로 가입 링크 발송
- **기존 유저**: 인앱 알림으로 초대

### 2. 초대 수락/거절

- `/invite/accept?token=xxx` 라우트에서 처리
- 토큰 검증 후 `team_members` 테이블에 추가
- 취소된 초대는 `/invite/cancelled`로 리다이렉트

### 3. 멤버 제거

```typescript
await teamMemberService.removeMember(memberId);
```

- Admin 이상만 제거 가능
- Owner는 제거 불가 (소유권 이전 필요)

### 4. 역할 변경

```typescript
await teamMemberService.updateMemberRole(memberId, newRole);
```

## 실시간 동기화

### Supabase Realtime 구독

```typescript
// useTeamRealtime.ts
const channel = supabase
  .channel(`team_members:${currentTeam.id}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'team_members',
    filter: `team_id=eq.${currentTeam.id}`,
  }, (payload) => {
    loadMembers(currentTeam.id);
  })
  .subscribe();
```

### 자동 멤버 삭제 (CASCADE)

유저가 Supabase에서 삭제되면 자동으로 모든 팀에서 제거됩니다:

```sql
ALTER TABLE team_members 
  ADD CONSTRAINT team_members_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;
```

## 데이터베이스 스키마

### team_members

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| team_id | uuid | FK → teams |
| user_id | uuid | FK → profiles (CASCADE DELETE) |
| role | text | owner/admin/member |
| joined_at | timestamp | 가입 일시 |

### team_invites

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| team_id | uuid | FK → teams |
| email | text | 초대 대상 이메일 |
| role | text | 부여할 역할 |
| token | text | 초대 토큰 |
| status | text | pending/accepted/cancelled |
| expires_at | timestamp | 만료 일시 |

## 보안

- ✅ Row Level Security (RLS) 적용
- ✅ Admin 이상만 멤버 관리 가능
- ✅ 초대 토큰 1회성 사용
- ✅ 초대 만료 시간 설정 (7일)

---

**관련 문서**
- [인증](./authentication.md)
- [데이터베이스 스키마](../architecture/database.md)
