---
name: Orchestrator
description: 멀티 에이전트 오케스트레이션 워크플로우. 다중 요청 분석, Planner-Worker 파이프라인, 병렬 서브에이전트 조율, 품질 게이트 관리. 복잡한 작업 요청 시 즉시 사용.
---

# Orchestrator Skill — Planner-Worker Pipeline

## 핵심 철학

> **"지금 방법이 최선인가?"** — 모든 작업 전 근원적으로 한 번 더 생각한다.
> 
> 1. 요청을 받으면 먼저 **WHY**를 확인한다
> 2. 여러 접근법을 비교한다 (최소 2개)
> 3. Trade-off를 명시한 후 실행한다

## 워크플로우 개요

```
[사용자 요청 수신]
       │
       ▼
[1. PLAN — 분석 & 설계]
  ├── 요청 분해 (Task Decomposition)
  ├── 의존성 그래프 생성
  ├── 대안 검토 ("이 방법이 최선인가?")
  └── Task List + Walkthrough 생성
       │
       ▼
[2. EXECUTE — 병렬/순차 실행]
  ├── 독립 작업 → 병렬 서브에이전트 (최대 4개)
  ├── 의존 작업 → 순차 실행
  └── 각 작업마다 품질 게이트 통과
       │
       ▼
[3. VALIDATE — 검증]
  ├── TypeScript 타입 검증 (tsc --noEmit)
  ├── 빌드 검증 (npm run build)
  ├── 테스트 실행 (npm run test)
  └── Lint 검증
       │
       ▼
[4. DELIVER — 일괄 커밋/푸시]
  ├── 단일 커밋 (다중 요청 → 하나의 커밋)
  ├── Edge Function 배포 (변경 시)
  └── 마이그레이션 푸시 (변경 시)
```

## Phase 1: PLAN

### Task Decomposition
```
사용자 요청: "A, B, C 기능 구현해줘"
       │
       ▼
Task 분해:
  T1: A 기능 (파일: X.tsx, Y.ts)
  T2: B 기능 (파일: Z.tsx)
  T3: C 기능 (파일: W.ts, V.tsx)
       │
       ▼
의존성 분석:
  T1 ──── T2 (독립) → 병렬 가능
  T3 ──→ T1 (T1 타입 필요) → T1 먼저
       │
       ▼
실행 계획:
  Phase A: T1, T2 (병렬)
  Phase B: T3 (T1 완료 후)
```

### 대안 검토 프레임워크
모든 중요 결정에 대해:

| 질문 | 확인 |
|------|------|
| 이 방법이 근본적 해결인가? | 증상 치료가 아닌 원인 해결 |
| 더 간단한 방법은 없는가? | 오버엔지니어링 방지 |
| 기존 코드/패턴을 재사용 가능한가? | 중복 방지 |
| 향후 확장에 문제 없는가? | 기술 부채 방지 |
| 성능 영향은? | 불필요한 리렌더링, 쿼리 최적화 |

### Task List 생성 규칙
- **항상** TodoWrite 도구로 Task List 생성
- 각 Task에 명확한 완료 기준 포함
- Walkthrough(단계별 설명) 병행
- 진행 중 상태 실시간 업데이트

## Phase 2: EXECUTE

### 병렬 실행 패턴

#### 서브에이전트 활용 (Task tool)
```
독립 작업 분배:
  Agent 1 (explore): 코드베이스 탐색/컨텍스트 수집
  Agent 2 (generalPurpose): 기능 A 구현
  Agent 3 (generalPurpose): 기능 B 구현
  Agent 4 (explore): 테스트 코드 조사
```

#### 병렬 가능 판단 기준
| 조건 | 병렬 | 순차 |
|------|------|------|
| 서로 다른 파일 수정 | ✅ | |
| 같은 파일 다른 함수 | ✅ | |
| 타입 정의 → 사용 | | ✅ |
| DB 스키마 → 서비스 코드 | | ✅ |
| 컴포넌트 → 스타일 | ✅ | |
| 마이그레이션 → Edge Function | | ✅ |

### 품질 게이트 (각 작업 후)
1. ReadLints로 편집 파일 린트 확인
2. 타입 에러 즉시 수정
3. import 경로 검증

## Phase 3: VALIDATE

### 검증 순서 (순차 실행)
```bash
# 1. TypeScript 타입 검증
npx tsc --noEmit

# 2. 빌드 검증
npm run build

# 3. 테스트 (변경된 영역)
npx vitest run --reporter=verbose

# 4. Lint 검증 (ReadLints 도구)
```

### 실패 시 처리
- 타입 에러 → 즉시 수정 후 재검증
- 빌드 에러 → 에러 분석 → Root Cause Analysis 스킬 적용
- 테스트 실패 → 실패 원인 분석 → 수정 후 재실행
- **3회 이상 실패 시** → 사용자에게 보고 + 대안 제시

## Phase 4: DELIVER

### 일괄 커밋 규칙
```bash
# 모든 변경사항 스테이징
git add -A

# 단일 커밋 (다중 기능 명시)
git commit -m "$(cat <<'EOF'
feat(scope): 요약 설명

- #1 기능 A 설명
- #2 기능 B 설명
- #3 기능 C 설명
EOF
)"

# 푸시
git push origin develop
```

### Edge Function 배포 (변경 시)
```bash
supabase functions deploy [function-name] --no-verify-jwt
```

### 마이그레이션 (변경 시)
```bash
supabase db push
```

## 스킬 연계 매트릭스

| 작업 유형 | 사용 스킬 조합 |
|-----------|---------------|
| 새 기능 개발 | orchestrator → react-component → testing → git-flow |
| DB 변경 | orchestrator → db-migration → supabase → edge-function-dev → testing |
| 버그 수정 | orchestrator → debugging → root-cause-analysis → testing → git-flow |
| 리팩토링 | orchestrator → refactoring → testing → performance → git-flow |
| AI 기능 | orchestrator → ai-integration → edge-function-dev → testing |
| UI/UX | orchestrator → ui-ux-pro-max → react-component → testing |

## 브라우저 테스트 정책

> [!CAUTION]
> **브라우저 테스트는 반드시 사용자 확인 후 실행**
> 
> 브라우저 없이 가능한 것:
> - Unit 테스트 (Vitest)
> - Component 테스트 (React Testing Library)
> - Service Layer 테스트 (모킹)
> - Edge Function 테스트 (curl/fetch)
> - TypeScript 타입 검증
> - 빌드 검증
> 
> 브라우저 필요한 것 (사용자에게 물어야 함):
> - 실제 UI 렌더링 확인
> - 드래그&드롭 인터랙션
> - 실제 네트워크 흐름 E2E

## 체크리스트

### 작업 시작 전
- [ ] 요청 분해 완료 (Task Decomposition)
- [ ] 의존성 그래프 확인
- [ ] 대안 검토 완료 ("이 방법이 최선인가?")
- [ ] Task List (TodoWrite) 생성
- [ ] Walkthrough 작성

### 작업 완료 후
- [ ] 전체 TypeScript 검증 통과
- [ ] 빌드 성공
- [ ] 관련 테스트 통과
- [ ] Lint 에러 없음
- [ ] 단일 커밋 메시지 작성
- [ ] 브랜치 전략 준수 (develop → main)
