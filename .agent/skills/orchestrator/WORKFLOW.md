# Master Orchestration Workflow

## 전체 워크플로우 다이어그램

```
╔══════════════════════════════════════════════════════════╗
║                 USER REQUEST RECEIVED                     ║
╚══════════════════════════════════════════════════════════╝
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 0: ANALYSIS (항상 실행)                           │
│                                                          │
│  1. 요청 파싱 및 분해                                      │
│  2. 관련 스킬 식별                                        │
│  3. 의존성 그래프 생성                                      │
│  4. "이 방법이 최선인가?" 검토                               │
│  5. TodoWrite로 Task List + Walkthrough 생성               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: CONTEXT GATHERING (병렬)                       │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ explore  │ │ explore  │ │ explore  │ │ explore  │  │
│  │ Agent 1  │ │ Agent 2  │ │ Agent 3  │ │ Agent 4  │  │
│  │ 코드탐색  │ │ 타입확인  │ │ 테스트조사│ │ 패턴분석  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: EXECUTION (병렬/순차 혼합)                      │
│                                                          │
│  독립 작업들:                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ generalPurp │ │ generalPurp │ │ generalPurp │       │
│  │ 기능 A 구현  │ │ 기능 B 구현  │ │ 기능 C 구현  │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
│         │               │               │               │
│         └───────────────┴───────────────┘               │
│                         │                                │
│  의존 작업들:            ▼                                │
│  ┌─────────────┐ → ┌─────────────┐ → ┌─────────────┐  │
│  │ DB Migration │   │ Service Code│   │ UI Component │  │
│  └─────────────┘   └─────────────┘   └─────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 3: QUALITY GATES (순차)                           │
│                                                          │
│  Gate 1: Lint Check (ReadLints)                          │
│    ↓ PASS                                                │
│  Gate 2: TypeScript (npx tsc --noEmit)                   │
│    ↓ PASS                                                │
│  Gate 3: Tests (npm run test)                            │
│    ↓ PASS                                                │
│  Gate 4: Build (npm run build)                           │
│    ↓ PASS                                                │
│  Gate 5: Code Review (code-reviewer subagent)            │
│    ↓ APPROVE                                             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 4: DELIVERY (순차)                                │
│                                                          │
│  1. git add -A                                           │
│  2. git commit -m "type(scope): description"             │
│  3. git push origin develop                              │
│  4. supabase functions deploy (Edge Function 변경 시)     │
│  5. supabase db push (마이그레이션 변경 시)                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  PHASE 5: VERIFICATION (선택적)                          │
│                                                          │
│  브라우저 테스트 필요? → 사용자에게 물어보기                   │
│  QA 리포트 생성 (qa-engineer subagent)                    │
│  Task List 완료 처리                                      │
└─────────────────────────────────────────────────────────┘
```

## 스킬 호출 매트릭스

### 요청 유형 → 스킬 체인

| 요청 유형 | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|-----------|---------|---------|---------|---------|---------|
| **새 기능** | orchestrator | explore | react-component, ai-integration | testing, code-reviewer | git-flow |
| **버그 수정** | orchestrator, root-cause-analysis | explore, debugging | debugging | testing (회귀) | git-flow |
| **DB 변경** | orchestrator, db-migration | explore, db-architect | supabase, edge-function-dev | testing | git-flow |
| **리팩토링** | orchestrator, refactoring | explore | refactoring | testing, performance | git-flow |
| **UI 변경** | orchestrator, ui-ux-pro-max | explore | react-component | testing | git-flow |
| **성능 개선** | orchestrator, performance | explore | performance | testing | git-flow |

### 서브에이전트 활용 가이드

| 서브에이전트 | 용도 | 호출 시점 |
|-------------|------|----------|
| code-reviewer | 코드 리뷰 | Phase 3 (커밋 전) |
| qa-engineer | 테스트 계획/실행 | Phase 3 (검증) |
| db-architect | DB 스키마 설계 | Phase 2 (DB 변경 시) |
| explore agent | 코드베이스 탐색 | Phase 1 (컨텍스트 수집) |

## 실패 복구 전략

### 빌드 실패
```
1. 에러 메시지 분석
2. Root Cause Analysis 적용
3. 수정 시도 (최대 3회)
4. 3회 실패 → 사용자에게 보고 + 대안 제시
```

### 테스트 실패
```
1. 실패 테스트 분석
2. 변경 사항으로 인한 정당한 실패? → 테스트 업데이트
3. 실제 버그? → 수정 + 회귀 테스트 추가
```

### 타입 에러
```
1. 에러 위치 확인
2. 올바른 타입으로 수정
3. 관련 파일 연쇄 수정
```

## 병렬 처리 최적화

### 동시 서브에이전트 제한: 4개
- 이유: Cursor IDE의 동시 실행 제한
- 초과 시: 배치로 나누어 순차 실행

### 서브에이전트 선택 전략
| 작업 복잡도 | 추천 |
|------------|------|
| 파일 탐색/검색 | `explore` (빠르고 저렴) |
| 단순 수정 | `fast` 모델 |
| 복잡한 구현 | `generalPurpose` |
| 깊은 분석 | `explore` (very thorough) |
