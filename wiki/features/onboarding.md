# 온보딩 플로우

> 신규 유저의 첫 경험을 안내합니다.

## 개요

신규 유저가 회원가입 후 팀을 생성하고 AI를 설정하는 과정입니다.

## 플로우

```
회원가입 → 이메일 인증 → /welcome (Landing) → 팀 생성 → AI 설정 → 대시보드
                                   ↑
                           초대 수락 시 건너뜀
```

## 페이지

### 1. Welcome 페이지 (`/welcome`)

**파일**: `src/pages/LandingPage.tsx`

신규 유저의 기본 랜딩:
- 제품 소개
- "시작하기" 버튼 → `/onboarding/create-team`

### 2. 팀 생성 (`/onboarding/create-team`)

**파일**: `src/pages/onboarding/CreateTeamPage.tsx`

| 필드 | 설명 |
|------|------|
| 팀 이름 | 필수 |
| URL Slug | 자동 생성, 수정 가능 |
| Issue Prefix | 선택 (기본: slug 대문자 3글자) |

- `create_team_with_owner` RPC 호출
- 생성자가 **Owner** 역할로 자동 추가

### 3. 프로젝트 생성 (`/onboarding/create-project`)

**파일**: `src/pages/onboarding/CreateProjectPage.tsx`

첫 프로젝트 생성 (선택 가능):
- 프로젝트 이름
- 설명
- 색상/아이콘

### 4. AI 설정 (`/onboarding/ai-setup`)

**파일**: `src/pages/onboarding/AISetupPage.tsx`

- AI 프로바이더 선택
- API 키 입력 (선택)
- "건너뛰기" 가능

## 리디렉션 로직

```tsx
// App.tsx - OnboardingCheck
if (!isEmailVerified && teams.length === 0) {
  return <Navigate to="/auth/verify-email" />;
}
if (teams.length === 0 && !onboardingCompleted) {
  return <Navigate to="/welcome" />;
}
```

## 초대 수락 시

초대를 통해 가입한 유저는 온보딩을 **건너뛰고** 바로 대시보드로 이동합니다. (`onboardingCompleted = true` 설정)

---

**관련 문서**
- [인증](./authentication.md)
- [팀 멤버 관리](./team-members.md)
