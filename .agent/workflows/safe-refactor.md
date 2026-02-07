---
description: 대형 파일을 안전하게 분할하는 워크플로우
---

# 안전한 리팩토링 워크플로우

⚠️ **이 워크플로우는 대형 파일 분할 시 사용합니다. 매우 조심스럽게 진행합니다.**

---

## 사전 체크

1. **현재 상태 확인**
```bash
# 변경사항 없음 확인
git status
```

2. **빌드 정상 확인**
// turbo
```bash
npm run build
```

---

## 1단계: 백업

// turbo
```bash
# 현재 상태 커밋
git add -A && git commit -m "checkpoint: before refactoring"
```

---

## 2단계: 분석

### 대형 파일 찾기
// turbo
```bash
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -10
```

### 의존성 확인
// turbo
```bash
# 해당 파일을 import하는 곳 확인
grep -r "from '.*[파일명]'" src --include="*.tsx" --include="*.ts" | wc -l
```

---

## 3단계: 분할 실행

**반드시 단계별로 진행!**

### A. 폴더 생성
```bash
mkdir -p src/[경로]/[모듈명]
```

### B. 개별 모듈 생성
- 각 모듈에 관련 코드 이동
- 필요한 import 추가

### C. index.ts 작성
```typescript
export * from './module1';
export * from './module2';
```

### D. 원본 → Shim 교체
```typescript
// 원본 파일을 re-export로 교체
export * from './[폴더명]';
```

---

## 4단계: 검증

### TypeScript 확인
// turbo
```bash
npx tsc --noEmit
```

### 빌드 확인
// turbo
```bash
npm run build
```

---

## 5단계: 커밋

// turbo
```bash
git add -A && git commit -m "refactor: [파일명] 모듈화"
```

---

## 롤백 방법

문제 발생 시:
```bash
# 이전 커밋으로 롤백
git reset --hard HEAD~1
```

---

## ⚠️ 분할 금지 대상

| 파일 | 이유 |
|------|------|
| lilyStore.ts | AI 상태 핵심, 동기화 버그 위험 |
| BlockEditor.tsx | TipTap 통합, 에디터 손상 위험 |
| Sidebar.tsx | UI 상태 복잡, UX 버그 위험 |
| database.ts | 타입 정의, 이미 구조화됨 |
