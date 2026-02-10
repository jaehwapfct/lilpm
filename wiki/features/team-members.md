# 👥 팀 멤버 관리

> 팀 멤버 초대, 권한 관리, 실시간 동기화, 활동 로깅

## 개요

LilPM은 팀 기반 협업 도구로, 멤버 초대 및 권한 관리를 지원합니다. 멤버 변경 사항은 **실시간으로 모든 팀원에게 동기화**됩니다.

## 팀 역할

| 역할 | 설명 | 권한 |
|------|------|------|
| **Owner** | 팀 생성자 | 모든 권한, 팀 삭제, 소유권 이전 |
| **Admin** | 관리자 | 멤버 초대/제거, 역할 변경, 설정 변경 |
| **Member** | 일반 멤버 | 이슈/PRD 생성 및 편집 |
| **Guest** | 게스트 | 읽기 전용 |

## 팀 생성 시 Owner 자동 할당

팀 생성 시 `create_team_with_owner` RPC 함수를 통해 생성자가 자동으로 **Owner** 역할로 추가됩니다:

```sql
-- supabase/migrations/20260207115000_fix_create_team_with_owner.sql
CREATE OR REPLACE FUNCTION create_team_with_owner(_name text, _slug text, _issue_prefix text DEFAULT NULL)
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

  RETURN json_build_object('id', new_team_id, 'name', _name, ...);
END;
$$;
```

## 멤버 초대 플로우

```
┌─────────────────┐
│  관리자가 초대   │
│ (이메일 입력)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase Auth  │
│ inviteUserByEmail│
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────────────┐
│   이메일 발송    │ ──→ │  /invite/accept?token=  │
└─────────────────┘     └────────────┬────────────┘
                                     │
                        ┌────────────┴────────────┐
                        ▼                         ▼
              ┌──────────────────┐     ┌──────────────────┐
              │  기존 유저 로그인  │     │   신규 유저 가입   │
              └────────┬─────────┘     └────────┬─────────┘
                       │                        │
                       └───────────┬────────────┘
                                   ▼
                        ┌──────────────────┐
                        │ 초대 미리보기 표시 │
                        │ • 팀 이름        │
                        │ • 초대자 이름     │
                        │ [수락] [거절]    │
                        └────────┬─────────┘
                                 │
                     ┌───────────┴───────────┐
                     ▼                       ▼
              [수락 클릭]              [거절 클릭]
                     │                       │
                     ▼                       ▼
              팀 멤버로 추가              홈으로 이동
```

## 초대 미리보기 (get-invite-preview Edge Function)

비인증 사용자도 초대 정보를 미리 볼 수 있도록 **Edge Function**을 사용합니다:

```typescript
// supabase/functions/get-invite-preview/index.ts
serve(async (req: Request) => {
  const { token } = await req.json();
  
  // Service Role로 RLS 우회
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: invite } = await supabase
    .from('team_invites')
    .select(`
      status, expires_at, email,
      team:teams(name),
      inviter:profiles!team_invites_invited_by_fkey(name, avatar_url)
    `)
    .eq('token', token)
    .single();

  // 만료 확인
  if (new Date(invite.expires_at) < new Date()) {
    return { valid: false, status: 'expired' };
  }

  return {
    valid: true,
    status: invite.status,
    teamName: invite.team?.name,
    inviterName: invite.inviter?.name,
    email: invite.email,
  };
});
```

**배포 명령:**
```bash
supabase functions deploy get-invite-preview --no-verify-jwt
```

## 초대 수락/거절 UI (AcceptInvitePage)

`/invite/accept?token=xxx` 페이지에서 **명시적인 수락/거절 버튼**을 표시합니다:

### 인증 체크 (중요!)

`acceptInvite` 함수 호출 전에 인증 상태를 확인하여 "Not authenticated" 에러를 방지합니다:

```tsx
// src/pages/auth/AcceptInvitePage.tsx (lines 98-109)
const acceptInvite = async () => {
  if (!token || isAccepting) return;
  
  // 인증 상태 확인 - 미인증 시 로그인으로 리디렉트
  if (!isAuthenticated) {
    const returnUrl = `/invite/accept?token=${token}`;
    navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    return;
  }
  
  setIsAccepting(true);
  // ... 실제 초대 수락 로직
};
```

### 인증된 유저용 UI

```tsx
// 인증된 유저용 수락/거절 UI
if (status === 'pending' && isAuthenticated) {
  return (
    <Card>
      <CardHeader>
        <Users className="h-6 w-6" />
        <CardTitle>Team Invitation</CardTitle>
        <CardDescription>
          {invitePreview.inviterName} has invited you to join
        </CardDescription>
        <div className="bg-muted rounded-md">
          <p className="font-semibold">{invitePreview.teamName}</p>
        </div>
      </CardHeader>
      <CardContent>
        <Button onClick={acceptInvite}>
          <CheckCircle2 /> Accept Invitation
        </Button>
        <Button variant="outline" onClick={declineInvite}>
          <XCircle /> Decline
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 상태별 랜딩 페이지

| 상태 | 표시 내용 |
|------|----------|
| pending (유효) | 팀명, 초대자 표시 + 수락/거절 버튼 |
| cancelled | ❌ "Invitation Cancelled" |
| expired | ⏱️ "Invitation Expired (24 hours)" |
| accepted | ℹ️ "Already accepted" |

## 초대 만료 (24시간)

- 초대 생성 시 `expires_at`이 24시간 후로 설정
- Pending 탭에서 실시간 카운트다운 표시
- 만료된 초대 링크 클릭 시 "Invitation Expired" 페이지 표시

## 멤버 제거

```typescript
await teamMemberService.removeMember(memberId);
```

- Admin 이상만 제거 가능
- Owner는 제거 불가 (소유권 이전 필요)

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
| user_id | uuid | FK → profiles |
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
| expires_at | timestamp | 만료 일시 (24시간) |
| created_at | timestamp | 생성 일시 |

## 팀 탈퇴

비 Owner 멤버는 팀에서 탈퇴할 수 있습니다:

```typescript
await teamMemberService.leaveTeam(teamId, userId);
```

- 확인 다이얼로그 표시
- Owner는 탈퇴 불가 (소유권 이전 필요)
- 탈퇴 후 팀 목록에서 제거

## Edge Functions

| 함수명 | 용도 | JWT 검증 |
|--------|------|----------|
| `accept-invite-v2` | 초대 수락 (인증/매직링크/회원가입, 프로젝트 할당) | ❌ |
| `get-invite-preview` | 초대 미리보기 (RLS 우회) | ❌ |
| `send-team-invite` | 팀 초대 이메일 발송 | ❌ |
| `send-member-removed` | 멤버 제거 알림 이메일 | ❌ |

## 프로젝트별 멤버 할당

팀 멤버의 드롭다운 메뉴에서 **프로젝트 할당** 옵션을 통해 멤버별로 접근 가능한 프로젝트를 관리할 수 있습니다.

### ProjectAssignmentModal

**파일**: `src/components/team/ProjectAssignmentModal.tsx`

```tsx
// 체크박스 기반 프로젝트 할당 UI
<ProjectAssignmentModal
  open={isOpen}
  onOpenChange={setIsOpen}
  member={selectedMember}
  teamId={currentTeam.id}
/>
```

**주요 기능**:
- 팀 내 모든 프로젝트 목록 표시
- 체크박스로 할당/해제
- 변경사항 일괄 저장
- 프로젝트 상태 배지 표시

자세한 내용은 [프로젝트 멤버 관리](./project-members.md) 문서를 참조하세요.

## 보안

- ✅ Row Level Security (RLS) 적용
- ✅ Admin 이상만 멤버 관리 가능
- ✅ 초대 토큰 1회성 사용
- ✅ 초대 만료 시간 24시간
- ✅ Service Role로만 미리보기 접근 가능
- ✅ 프로젝트별 멤버 RLS로 비할당 유저 접근 차단

---

**관련 문서**
- [인증](./authentication.md)
- [프로젝트 멤버 관리](./project-members.md)
- [데이터베이스 스키마](../architecture/database.md)

