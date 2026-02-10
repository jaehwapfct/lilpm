---
name: Testing Strategy
description: 종합 테스트 전략. 단위/모듈/통합/회귀/E2E 테스트 가이드. 브라우저 최소화, 자동화 파이프라인 포함. 코드 변경 후 테스트 작성 시 즉시 사용.
---

# Testing Strategy Skill

## 핵심 원칙

1. **브라우저 테스트 최소화** — 꼭 필요한 경우만, 반드시 사용자에게 먼저 물어볼 것
2. **빠른 피드백** — 단위 테스트 우선, 빌드 파이프라인에 통합
3. **높은 커버리지** — 핵심 비즈니스 로직 100% 테스트
4. **회귀 방지** — 버그 수정 시 반드시 회귀 테스트 추가
5. **근원적 테스트** — 증상이 아닌 원인을 테스트

## 테스트 피라미드 (우선순위)

```
        ╱╲
       ╱E2E╲ ←── 브라우저 필요 (사용자 확인!)
      ╱──────╲
     ╱ 통합    ╲ ←── API + 서비스 레이어
    ╱────────────╲
   ╱  컴포넌트    ╲ ←── React Testing Library
  ╱────────────────╲
 ╱   단위 테스트     ╲ ←── 순수 함수, 유틸, 훅
╱────────────────────╲
```

## 1. 단위 테스트 (최우선)

### 순수 함수 / 유틸
```typescript
import { describe, it, expect } from 'vitest';
import { formatDate, calculatePriority } from '@/lib/utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    expect(formatDate(new Date('2025-01-01'))).toBe('Jan 1, 2025');
  });

  it('should handle null date', () => {
    expect(formatDate(null)).toBe('');
  });

  it('should handle invalid date', () => {
    expect(formatDate(new Date('invalid'))).toBe('Invalid date');
  });
});
```

### Zustand Store 테스트
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useTeamStore } from '@/stores/teamStore';

describe('teamStore', () => {
  beforeEach(() => {
    useTeamStore.setState({ teams: [], currentTeam: null });
  });

  it('should set current team', () => {
    const team = { id: '1', name: 'Test' };
    useTeamStore.getState().setCurrentTeam(team);
    expect(useTeamStore.getState().currentTeam).toEqual(team);
  });
});
```

### Custom Hook 테스트
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useIssues } from '@/hooks/data/useIssues';

describe('useIssues', () => {
  it('should fetch issues for team', async () => {
    const { result } = renderHook(() => useIssues('team-id'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

## 2. 서비스 레이어 테스트

### Supabase 모킹 패턴
```typescript
import { vi, describe, it, expect } from 'vitest';

// Supabase 클라이언트 모킹
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null })
        }),
        order: vi.fn().mockResolvedValue({ data: mockList, error: null })
      }),
      insert: vi.fn().mockResolvedValue({ data: newItem, error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: updatedItem, error: null })
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    }
  }
}));

describe('issueService', () => {
  it('should create issue with correct fields', async () => {
    const result = await issueService.create({
      title: 'Test Issue',
      teamId: 'team-1',
      projectId: 'proj-1'
    });
    expect(result).toBeDefined();
    expect(supabase.from).toHaveBeenCalledWith('issues');
  });
});
```

## 3. 컴포넌트 테스트

### React Testing Library
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// 필요한 Provider 래퍼
const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>
      {children}
    </MemoryRouter>
  </QueryClientProvider>
);

describe('IssueCard', () => {
  it('renders issue title', () => {
    render(<IssueCard issue={mockIssue} />, { wrapper });
    expect(screen.getByText('Test Issue')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<IssueCard issue={mockIssue} onClick={onClick} />, { wrapper });
    fireEvent.click(screen.getByText('Test Issue'));
    expect(onClick).toHaveBeenCalledWith(mockIssue.id);
  });

  it('shows priority badge', () => {
    render(<IssueCard issue={{ ...mockIssue, priority: 'urgent' }} />, { wrapper });
    expect(screen.getByTestId('priority-badge')).toHaveTextContent('Urgent');
  });
});
```

## 4. 통합 테스트

### API 흐름 테스트
```typescript
describe('Issue creation flow', () => {
  it('should create issue and update project issue count', async () => {
    // 1. 이슈 생성
    const issue = await issueService.create({ ... });
    expect(issue).toBeDefined();

    // 2. 프로젝트 이슈 카운트 확인
    const project = await projectService.get(issue.projectId);
    expect(project.issueCount).toBeGreaterThan(0);
  });
});
```

### Edge Function 통합 테스트 (curl)
```bash
# 초대 발송 테스트
curl -X POST $SUPABASE_URL/functions/v1/send-team-invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "teamId": "team-1", "role": "member"}'

# 응답 검증
# 200 OK → 성공
# 400 → 입력 검증 에러
# 401 → 인증 에러
# 409 → 중복 초대
```

## 5. 회귀 테스트 전략

### 버그 수정 시 필수
```
[버그 발견]
     │
     ▼
[1. 실패하는 테스트 먼저 작성]
     │
     ▼
[2. 버그 수정]
     │
     ▼
[3. 테스트 통과 확인]
     │
     ▼
[4. 관련 영역 기존 테스트도 통과 확인]
```

### 회귀 테스트 체크리스트
- [ ] 변경된 파일의 기존 테스트 통과
- [ ] 변경된 컴포넌트 렌더링 정상
- [ ] 관련 서비스 함수 동작 정상
- [ ] import/export 경로 정상
- [ ] TypeScript 타입 검증 (`npx tsc --noEmit`)
- [ ] 빌드 성공 (`npm run build`)

## 6. E2E 테스트 (브라우저 필요)

> [!CAUTION]
> **브라우저 테스트 전 반드시 사용자에게 확인!**
> "브라우저 테스트가 필요합니다. 실행해도 될까요?"

### 브라우저 없이 가능한 E2E 대안
```typescript
// API 레벨 E2E (브라우저 불필요)
describe('Full invite flow (API level)', () => {
  it('should complete invite → accept → team member', async () => {
    // 1. 초대 생성
    const invite = await createInvite(teamId, email);
    expect(invite.status).toBe('pending');

    // 2. 초대 수락
    const result = await acceptInvite(invite.token);
    expect(result.success).toBe(true);

    // 3. 팀 멤버 확인
    const members = await getTeamMembers(teamId);
    expect(members).toContainEqual(
      expect.objectContaining({ email })
    );
  });
});
```

### 브라우저 테스트가 정말 필요한 경우만
- 복잡한 드래그&드롭 (DnD Kit)
- TipTap 에디터 인터랙션
- Canvas/SVG 렌더링
- 스크린샷 비교 테스트
- 실시간 WebSocket 협업 플로우

## Vitest 설정

### 실행 명령어
```bash
# 모든 테스트
npm run test

# 특정 파일/디렉토리
npx vitest run src/lib/services/team

# 워치 모드
npm run test:watch

# 커버리지
npx vitest run --coverage

# 특정 테스트명
npx vitest run -t "should create issue"

# 변경된 파일만 (CI용)
npx vitest run --changed
```

### 테스트 파일 위치 규칙
```
src/
├── lib/services/team/
│   ├── teamService.ts
│   └── __tests__/
│       └── teamService.test.ts
├── components/issues/
│   ├── IssueCard.tsx
│   └── __tests__/
│       └── IssueCard.test.tsx
├── hooks/data/
│   ├── useIssues.ts
│   └── __tests__/
│       └── useIssues.test.ts
└── test/
    ├── setup.ts
    └── helpers/
        ├── renderWithProviders.tsx
        └── mockData.ts
```

## 자동화 파이프라인

### 코드 변경 → 테스트 → 빌드 → 커밋
```bash
# 1. 테스트 실행
npm run test

# 2. 타입 검증
npx tsc --noEmit

# 3. 빌드 검증
npm run build

# 4. 모두 통과 시 커밋
git add -A && git commit -m "feat: description" && git push origin develop
```

### 실패 시 처리
- 테스트 실패 → 실패 원인 분석 → 수정 → 재실행
- 타입 에러 → 타입 수정 → 재검증
- 빌드 에러 → Root Cause Analysis 적용
- **3회 이상 실패 시** → 사용자에게 보고
