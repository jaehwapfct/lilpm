# 🔐 인증

> 안전한 사용자 인증 및 팀 접근 관리

## 개요

LilPM은 Supabase Auth를 기반으로 이메일/비밀번호 인증을 제공합니다. 회원가입 후 이메일 인증이 필요합니다.

## 인증 플로우

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   회원가입   │ ──→ │ 이메일 인증  │ ──→ │   /welcome  │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    │
                          ▼                    ▼
                    인증 링크 클릭        ┌───────────────┐
                          │              │ 온보딩 선택    │
                          │              │ • 팀 생성      │
                          │              │ • AI 설정      │
                          │              │ • LLM 설정     │
                          │              └───────┬───────┘
                          │                      ↓
┌─────────────┐     ┌─────────────────────────────────┐
│    로그인    │ ←── │         홈 대시보드              │
└─────────────┘     └─────────────────────────────────┘
```

## 리디렉션 로직 (App.tsx lines 102-109)

```tsx
// 이메일 미인증 + 팀 없음 → 이메일 인증 페이지
if (!isEmailVerified && teams.length === 0) {
  return <Navigate to="/auth/verify-email" replace />;
}

// 팀 없음 + 온보딩 미완료 → /welcome 페이지
if (teams.length === 0 && !onboardingCompleted) {
  return <Navigate to="/welcome" replace />;
}
```

**중요:** 팀이 없는 신규 유저는 `/onboarding/create-team`이 아닌 **`/welcome`** 페이지로 리디렉션됩니다.

## 주요 기능

### 1. 이메일 인증

회원가입 후 이메일 인증이 필요합니다:

```typescript
// authStore.ts
signup: async (email, password, name) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/welcome`,
      data: { name },
    },
  });
  
  // 인증 대기 페이지로 리다이렉트
  navigate('/auth/verify-email');
}
```

### 2. 인증 상태 관리

```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isLoading: boolean;
}
```

### 3. 라우트 보호

```tsx
// App.tsx
<Route element={<ProtectedRoute />}>
  <Route element={<OnboardingCheck />}>
    <Route path="/" element={<HomePage />} />
  </Route>
</Route>

// ProtectedRoute - 로그인 필수
// OnboardingCheck - 이메일 인증 + 팀 존재 확인
```

## 페이지 구성

### 회원가입 (`/signup`)
- 이름, 이메일, 비밀번호 입력
- 가입 후 `/auth/verify-email`로 리다이렉트

### 이메일 인증 대기 (`/auth/verify-email`)
- 인증 이메일 발송 안내
- "인증 이메일 재발송" 버튼
- 인증 완료 시 자동 리다이렉트

### Welcome 페이지 (`/welcome`)
신규 유저의 기본 랜딩 페이지:
- 팀 생성 옵션
- AI 설정 옵션
- 튜토리얼 링크

### 로그인 (`/login`)
- 이메일, 비밀번호 입력
- 미인증 사용자는 `/auth/verify-email`로 리다이렉트
- 팀 없으면 `/welcome`으로 리다이렉트

### 비밀번호 재설정 (`/password-reset`)
- 이메일 입력으로 재설정 링크 발송

## 초대 수락 페이지 (`/invite/accept`)

팀 초대 링크를 통해 가입한 유저의 플로우:

```
초대 링크 클릭 → 초대 미리보기 표시 → [수락] / [거절]
                      ↓
            ┌────────┴────────┐
            │  인증 상태?      │
            └────────┬────────┘
    인증됨 ↙         ↓           ↘ 미인증
  수락 처리    로그인으로 리디렉트   로그인/가입 UI
      ↓         (returnUrl 포함)        ↓
   팀 합류           ↓             회원가입
      ↓          로그인 후              ↓
   홈 이동       초대 페이지 복귀     이메일 인증
                    ↓                  ↓
                 수락 처리         /auth/verify-email
```

### 인증 체크 (중요!)

`acceptInvite` 호출 시 인증되지 않은 경우 로그인으로 리디렉트:

```tsx
// AcceptInvitePage.tsx (lines 98-109)
if (!isAuthenticated) {
  const returnUrl = `/invite/accept?token=${token}`;
  navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  return;
}
```

### 이메일 인증 경로

신규 가입 시 이메일 인증 페이지 경로:
- ✅ 올바른 경로: `/auth/verify-email`
- ❌ 잘못된 경로: `/verify-email` (404 발생)

**중요:** 초대 수락 후에는 온보딩 단계(팀 생성, LLM 설정 등)를 **건너뛰고** 바로 홈으로 이동합니다.

## 온보딩 플로우

인증 완료 후 `/welcome`에서 시작:

1. **팀 생성** (`/onboarding/create-team`)
   - 팀 이름 입력
   - 팀 URL slug 설정
   - 생성자가 자동으로 **Owner** 역할 부여

2. **AI 설정** (`/onboarding/ai-setup`)
   - AI API 키 입력 (선택)
   - 기본 AI 모델 선택

## 권한 관리

### 팀 역할

| 역할 | 권한 |
|------|------|
| **Owner** | 모든 권한, 팀 삭제 |
| **Admin** | 멤버 관리, 설정 변경 |
| **Member** | 이슈/PRD 생성 및 편집 |
| **Guest** | 읽기 전용 |

### 팀 초대 (Edge Functions)

| 함수명 | 용도 |
|--------|------|
| `get-invite-preview` | 비인증 유저의 초대 미리보기 (--no-verify-jwt) |
| `send-team-invite` | 팀 초대 이메일 발송 |

## 보안 고려사항

- ✅ 비밀번호는 Supabase에서 bcrypt 해싱
- ✅ JWT 토큰 기반 세션 관리
- ✅ 이메일 인증 필수
- ✅ API 키는 서버 사이드 암호화 저장
- ✅ Row Level Security (RLS) 적용
- ✅ Service Role로만 초대 미리보기 접근

---

**관련 문서**
- [팀 멤버 관리](./team-members.md)
- [프론트엔드 아키텍처](../architecture/frontend.md)
- [데이터베이스 스키마](../architecture/database.md)
