---
name: Code Refactoring
description: 모듈화, 폴더 구조화, 대형 파일 분할 가이드
---

# Code Refactoring Skill

## 사용 시나리오
- 서비스 레이어 분할
- UI 컴포넌트 재구조화
- 대형 파일 (>300줄) 분해
- API 모듈 분리

## ⚠️ 리팩토링 원칙

### 안전성 우선
1. **한 번에 하나씩** - 여러 변경 동시 금지
2. **빌드 검증 필수** - 매 단계 `npm run build`
3. **하위 호환성** - 기존 import 경로 유지

### 분할 기준
| 파일 크기 | 조치 |
|----------|------|
| < 200줄 | 유지 |
| 200-500줄 | 검토 |
| > 500줄 | 분할 권장 |
| > 1000줄 | 분할 필수 |

## 폴더 구조화 패턴

### 서비스 레이어
```
lib/services/
├── team/
│   ├── profileService.ts
│   ├── teamService.ts
│   ├── teamMemberService.ts
│   └── index.ts
├── issue/
│   ├── issueService.ts
│   ├── labelService.ts
│   └── index.ts
└── teamService.ts  ← re-export shim
```

### UI 컴포넌트
```
components/ui/
├── forms/       ← button, input, select
├── overlay/     ← dialog, sheet, popover
├── navigation/  ← dropdown-menu, tabs
├── display/     ← avatar, badge, card
└── index.ts     ← 전체 re-export
```

## Re-export Shim 패턴

### 원본 파일 교체
```typescript
// teamService.ts (원본 → shim)
export * from './team';
```

### 서브폴더 index.ts
```typescript
// team/index.ts
export { profileService } from './profileService';
export { teamService } from './teamService';
export { teamMemberService } from './teamMemberService';
```

## 분할 프로세스

### 1. 분석
```bash
# 대형 파일 찾기
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -20
```

### 2. 계획
- 도메인별로 그룹화
- 순환 의존성 확인
- index.ts 구조 설계

### 3. 실행
1. 서브폴더 생성
2. 개별 모듈 생성
3. index.ts 작성
4. 원본 → re-export shim

### 4. 검증
```bash
npx tsc --noEmit
npm run build
```

## ⚠️ 분할하면 안 되는 경우

| 파일 | 이유 |
|------|------|
| lilyStore.ts | AI 상태 관리 핵심, 분할 시 동기화 버그 |
| BlockEditor.tsx | TipTap 통합, 분할 시 에디터 손상 |
| database.ts | 타입 정의, 이미 논리적으로 구조화됨 |

## 체크리스트

### 분할 전
- [ ] 원본 파일 백업 (git에 커밋)
- [ ] 의존성 그래프 분석
- [ ] 분할 계획 문서화

### 분할 후
- [ ] TypeScript 검증 통과
- [ ] 빌드 성공
- [ ] 기존 import 경로 동작 확인
- [ ] 테스트 통과
