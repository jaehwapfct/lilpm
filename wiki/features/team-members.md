# 👥 팀 멤버 관리

> 팀 멤버 초대, 권한 관리, 실시간 동기화, 활동 로깅

## 개요

LilPM은 팀 기반 협업 도구로, 멤버 초대 및 권한 관리를 지원합니다. 멤버 변경 사항은 **실시간으로 모든 팀원에게 동기화**됩니다. 모든 중요 액션은 `activity_logs` 테이블에 기록됩니다.

## 팀 역할

| 역할 | 설명 | 권한 |
|------|------|------|
| **Owner** | 팀 생성자 | 모든 권한, 팀 삭제, 소유권 이전 |
| **Admin** | 관리자 | 멤버 초대/제거, 역할 변경, 설정 변경 |
| **Member** | 일반 멤버 | 이슈/PRD 생성 및 편집 |
| **Guest** | 게스트 | 읽기 전용 |

## 멤버 초대 플로우

```
┌─────────────────┐
│  관리자가 초대   │
│ (이메일 입력)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐    기존 유저?    ┌─────────────────┐
│ Edge Function   │ ──── YES ──────→│ 인앱 알림 + 이메일│
│ send-team-invite│                 └─────────────────┘
└────────┬────────┘
         │ NO (신규 유저)
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Supabase Auth   │ ──→ │ 가입 초대 이메일 │
│ inviteUserByEmail│    │ /invite/accept  │
└─────────────────┘     └─────────────────┘
```

## 주요 기능

### 1. 멤버 초대

```typescript
// teamInviteService.createInvite()
const token = crypto.randomUUID();
const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24시간

const { data } = await supabase.from('team_invites').insert({
  team_id: teamId,
  email,
  role,
  invited_by: user.id,
  token,
  status: 'pending',
  expires_at: expiresAt,
});
```

- **신규 유저**: Supabase Auth로 가입 초대 이메일 발송
- **기존 유저**: 인앱 알림 + 이메일 발송

### 2. 초대 만료 (24시간)

- 초대 생성 시 `expires_at`이 24시간 후로 설정됨
- Pending 탭에서 실시간 카운트다운 표시 (매분 갱신)
- 만료된 초대 링크 클릭 시 "Invitation Expired" 페이지 표시

**Pending 탭 UI:**
| 컬럼 | 내용 |
|------|------|
| Email | 초대 대상 이메일 |
| Role | 부여할 역할 |
| Status | 🟡 Waiting / 🔴 Expired |
| Time Left | 남은 시간 (예: "23h 45m left") |

### 3. 초대 수락/거절

- `/invite/accept?token=xxx` 라우트에서 처리
- 토큰 + 만료 + 상태 검증 후 `team_members` 테이블에 추가

**상태별 랜딩 페이지:**
| 상태 | 표시 내용 |
|------|----------|
| pending (유효) | 자동 수락 처리 → 팀 대시보드 |
| cancelled | ❌ "Invitation Cancelled" |
| expired | ⏱️ "Invitation Expired (24 hours)" |
| accepted | ℹ️ "Already accepted" |

### 4. 멤버 제거

```typescript
await teamMemberService.removeMember(memberId);
```

- Admin 이상만 제거 가능
- Owner는 제거 불가 (소유권 이전 필요)
- **제거된 유저에게 알림 발송**:
  - 인앱 알림: "You have been removed from [팀명]"
  - 이메일 알림: Edge Function `send-member-removed` 통해 발송

### 5. 역할 변경

```typescript
await teamMemberService.updateMemberRole(memberId, newRole);
```

- 역할 변경 시 `activity_logs`에 기록됨

## 활동 로깅 (Activity Logs)

모든 중요 액션이 `activity_logs` 테이블에 기록됩니다:

| action_type | 설명 |
|-------------|------|
| `invite_sent` | 초대 발송 |
| `invite_cancelled` | 초대 취소 |
| `invite_accepted` | 초대 수락 |
| `role_changed` | 역할 변경 (old → new 기록) |
| `member_removed` | 멤버 제거 |

```typescript
// activityService.ts
logInviteSent(teamId, inviteId, email, role, isExistingUser);
logInviteCancelled(teamId, inviteId, email);
logInviteAccepted(teamId, inviteId, userId);
logRoleChanged(teamId, memberId, userId, oldRole, newRole);
logMemberRemoved(teamId, memberId, userId, role);
```

## 실시간 동기화

### Supabase Realtime 구독

```typescript
// TeamMembersPage.tsx
const channel = supabase
  .channel(`team_members:${currentTeam.id}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'team_members',
    filter: `team_id=eq.${currentTeam.id}`,
  }, () => loadData())
  .subscribe();
```

## 데이터베이스 스키마

### team_members

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| team_id | uuid | FK → teams |
| user_id | uuid | FK → profiles (CASCADE DELETE) |
| role | text | owner/admin/member/guest |
| joined_at | timestamp | 가입 일시 |

### team_invites

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| team_id | uuid | FK → teams |
| email | text | 초대 대상 이메일 |
| role | text | 부여할 역할 |
| token | text | 초대 토큰 (UUID) |
| status | text | pending/accepted/cancelled/expired |
| invited_by | uuid | 초대한 유저 ID |
| expires_at | timestamp | 만료 일시 (생성 후 24시간) |
| created_at | timestamp | 생성 일시 |

### activity_logs

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| team_id | uuid | FK → teams |
| user_id | uuid | 액션 수행자 |
| action_type | text | 액션 종류 |
| target_type | text | team_member/team_invite |
| target_id | uuid | 대상 ID |
| old_value | jsonb | 변경 전 값 |
| new_value | jsonb | 변경 후 값 |
| created_at | timestamp | 액션 일시 |

## Edge Functions

| 함수명 | 용도 |
|--------|------|
| `send-team-invite` | 팀 초대 이메일 발송 |
| `send-member-removed` | 멤버 제거 알림 이메일 발송 |

## 보안

- ✅ Row Level Security (RLS) 적용
- ✅ Admin 이상만 멤버 관리 가능
- ✅ 초대 토큰 1회성 사용
- ✅ 초대 만료 시간 24시간

---

**관련 문서**
- [인증](./authentication.md)
- [데이터베이스 스키마](../architecture/database.md)
