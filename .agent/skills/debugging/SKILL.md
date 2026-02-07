---
name: Debugging Expert
description: 흔한 에러 패턴 빠른 진단 및 해결
triggers:
  - 에러 메시지 포함된 요청
  - "안 돼", "에러", "버그" 키워드
---

# 디버깅 스킬

## 🔍 에러 진단 순서

1. 에러 메시지 정확히 읽기
2. 아래 패턴 목록에서 매칭 확인
3. 해당 해결책 적용

---

## ⚡ 흔한 에러 패턴

### 1. "Not authenticated" (Supabase Auth)

**원인**: 세션 만료 또는 authStore와 실제 Supabase 세션 불일치

**해결**:
```typescript
// 실제 세션 확인 (authStore 믿지 말고!)
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  navigate('/login?returnUrl=' + encodeURIComponent(currentPath));
  return;
}
```

**적용 예시**: AcceptInvitePage의 `hasValidSession` 패턴

---

### 2. "Cannot read properties of null/undefined"

**원인**: 비동기 데이터 로딩 전 접근

**해결**:
```typescript
// 로딩 중 early return
if (isLoading || !data) return <Loading />;

// 옵셔널 체이닝 + nullish coalescing
const name = data?.user?.name ?? 'Unknown';
const items = data?.items ?? [];
```

---

### 3. "Database error deleting user" (FK 제약조건)

**원인**: CASCADE/SET NULL 미설정된 FK 참조

**해결**:
1. `supabase/functions/delete-users/index.ts` 확인
2. 새 테이블에 user_id 참조 있는지 확인:
   ```bash
   grep -r "user_id\|REFERENCES auth.users" supabase/migrations/*.sql | tail -20
   ```
3. delete-users 함수에 테이블 추가
4. 재배포: `supabase functions deploy delete-users --no-verify-jwt`

---

### 4. 404 Not Found (라우팅)

**체크포인트**:
1. `App.tsx` 라우트 정의 확인
2. 경로 철자 확인:
   - ❌ `/verify-email`
   - ✅ `/auth/verify-email`
3. ProtectedRoute / OnboardingCheck 래퍼 확인

---

### 5. RLS 정책 위반 (new row violates)

**원인**: INSERT/UPDATE 시 RLS 조건 불충족

**진단**:
```sql
-- Supabase SQL Editor에서
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

**해결**: RLS 정책 조건 확인 및 수정

---

### 6. "Invalid invite token" / 초대 관련

**체크포인트**:
1. team_invites 테이블에서 토큰 상태 확인
2. expires_at 만료 여부
3. status가 'pending'인지

**진단**:
```sql
SELECT * FROM team_invites WHERE token = 'YOUR_TOKEN';
```

---

### 7. TypeScript 타입 에러

**흔한 패턴**:
```typescript
// as any 대신 proper typing
const typedData = data as YourType;

// unknown 타입 처리
if (error instanceof Error) {
  console.error(error.message);
}
```

---

## 🛠️ 디버깅 도구

### 브라우저 개발자 도구
- Network 탭: API 요청/응답 확인
- Console: 에러 스택트레이스

### Supabase Dashboard
- Table Editor: 데이터 직접 확인
- Logs: Edge Function 실행 로그
- Auth > Users: 사용자 상태

### 로컬 명령어
```bash
# 개발 서버 로그 확인
npm run dev

# 타입 에러만 확인
npx tsc --noEmit
```
