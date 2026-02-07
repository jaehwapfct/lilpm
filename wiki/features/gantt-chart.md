# 📊 간트 차트

> 프로젝트 일정을 시각적으로 관리하세요.

## 개요

간트 차트는 이슈의 시작일과 마감일을 타임라인으로 표시합니다. 드래그앤드롭으로 일정을 조정하고, 의존성을 설정하여 작업 순서를 관리할 수 있습니다.

## 레이아웃

```
┌─────────────────┬──────────────────────────────────────────┐
│    사이드바      │              타임라인                     │
├─────────────────┼──────────────────────────────────────────┤
│ ▸ 이슈 1        │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ ▸ 이슈 2        │         ████████████░░░░░░░░░░░░░░░░░░░  │
│ ▸ 이슈 3        │                     ██████████████░░░░░  │
└─────────────────┴──────────────────────────────────────────┘
      ↑                           ↑
   행 드래그                   바 드래그
   (순서 변경)                (일정 변경)
```

## 주요 기능

### 1. 드래그앤드롭

| 드래그 대상 | 동작 |
|-------------|------|
| **바 중앙** | 시작일/마감일 함께 이동 |
| **바 왼쪽** | 시작일만 변경 |
| **바 오른쪽** | 마감일만 변경 |
| **사이드바 행** | 이슈 순서 변경 |

### 2. 의존성 연결 (Link Points)

바의 양 끝에 **확대된 링크 포인트**가 표시됩니다:

```tsx
// GanttChart.tsx (lines 1787-1830)
<div
  data-link-point="left"
  data-issue-id={issue.id}
  className={cn(
    "absolute -left-2 top-1/2 -translate-y-1/2",
    "w-4 h-4 rounded-full border-2 border-white/90",
    "cursor-crosshair z-30 transition-all",
    linkingFrom
      ? "opacity-100 bg-amber-500 scale-110"
      : "opacity-0 group-hover/bar:opacity-100 bg-amber-500 hover:scale-125"
  )}
/>
```

**링크 포인트 특징:**
- **크기**: `w-4 h-4` (16x16px) - 클릭하기 쉬운 크기
- **표시**: 마우스 호버 시 또는 연결 모드일 때
- **색상**: 기본 `amber-500`, 타겟 `green-500`
- **스케일**: 호버 시 `scale-125`, 타겟 시 `scale-150`

### 3. Jira 스타일 어사이니 필터 (lines 911-983)

담당자 아바타를 클릭하여 필터링:

```tsx
// GanttChart.tsx - Assignee Filter
const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(new Set());

// 유니크 담당자 추출
const assigneeMap = new Map();
issues.forEach(issue => {
  if (issue.assigneeId && issue.assignee) {
    assigneeMap.set(issue.assigneeId, {
      id: issue.assigneeId,
      name: issue.assignee.name || issue.assignee.email,
      avatar: issue.assignee.avatarUrl,
    });
  }
});

// 아바타 토글 UI
{uniqueAssignees.slice(0, 8).map(assignee => (
  <button
    className={cn(
      "rounded-full transition-all",
      selectedAssignees.has(assignee.id)
        ? "ring-2 ring-primary ring-offset-1 opacity-100"
        : "opacity-60 hover:opacity-100"
    )}
    onClick={() => toggleAssignee(assignee.id)}
  >
    <Avatar className="h-7 w-7">
      <AvatarImage src={assignee.avatar} />
      <AvatarFallback>{assignee.name.slice(0, 2)}</AvatarFallback>
    </Avatar>
  </button>
))}

// Clear 버튼
{selectedAssignees.size > 0 && (
  <Button variant="ghost" onClick={() => setSelectedAssignees(new Set())}>
    Clear
  </Button>
)}
```

**필터 특징:**
- **다중 선택**: 여러 담당자 동시 선택 가능
- **선택 표시**: 선택된 아바타에 링 표시
- **Clear 버튼**: 모든 필터 해제
- **최대 표시**: 8명까지 표시

### 4. 그룹화

그룹화 옵션:
- **없음**: 모든 이슈 평면 표시
- **프로젝트별**: 프로젝트 그룹으로 정렬
- **상태별**: 상태 그룹으로 정렬
- **우선순위별**: 우선순위 그룹으로 정렬
- **담당자별**: 담당자 그룹으로 정렬

### 5. 줌 컨트롤

| 뷰 | 단위 | 용도 |
|----|------|------|
| 일 | 1일 | 상세 일정 확인 |
| 주 | 7일 | 일반적인 뷰 (기본값) |
| 월 | 30일 | 장기 일정 확인 |

### 6. SVG 라인 클리핑 (line 1193)

의존성 라인이 뷰포트 밖으로 넘어가지 않도록 처리:

```tsx
<div
  className="relative"
  style={{ overflow: 'hidden' }}
>
  <svg>
    {/* 의존성 라인들 */}
  </svg>
</div>
```

## 기술 구현

### 드래그 시스템

LilPM 간트 차트는 **순수 마우스 이벤트** 기반 드래그 시스템을 사용합니다:

```typescript
// 상태 머신
type DragMode = 
  | 'none'           // 드래그 없음
  | 'pending-bar'    // 바 클릭 후 대기
  | 'pending-row'    // 행 클릭 후 대기
  | 'move'           // 바 이동 중
  | 'resize-start'   // 시작일 조정 중
  | 'resize-end'     // 마감일 조정 중  
  | 'row-reorder'    // 행 순서 변경 중
  | 'linking'        // 의존성 연결 중
```

### sortOrder 계산

행 순서는 `sortOrder` 필드로 관리됩니다:

```typescript
const BASE_GAP = 1000;

function calculateNewSortOrder(
  targetIndex: number,
  position: 'before' | 'after',
  effectiveOrderMap: Map<string, number>
): number {
  const lowerBound = targetIndex > 0 ? orderMap.get(items[targetIndex-1].id) : 0;
  const upperBound = targetIndex < items.length - 1 
    ? orderMap.get(items[targetIndex+1].id) 
    : lowerBound + BASE_GAP * 2;
  return (lowerBound + upperBound) / 2;
}
```

### 의존성 렌더링

SVG 레이어에서 베지어 곡선으로 연결:

```typescript
const path = `M ${startX} ${startY} 
              C ${startX + 50} ${startY}, 
                ${endX - 50} ${endY}, 
                ${endX} ${endY}`;
```

## 트러블슈팅

### 드래그 시 랜덤 점프 현상

**원인**: `sortOrder` 계산 시 렌더 순서와 정렬 순서 불일치

**해결**: 
```typescript
// ✅ 올바른 방법 - 렌더 순서 사용
const effectiveOrderMap = new Map();
allIssues.forEach((issue, index) => {
  effectiveOrderMap.set(issue.id, issue.sortOrder ?? (index + 1) * BASE_GAP);
});
```

### 의존성 라인이 드래그 막음

**원인**: SVG 요소가 마우스 이벤트 가로채기

**해결**:
```tsx
<svg style={{ pointerEvents: dragMode !== 'none' ? 'none' : 'auto' }}>
  {/* 의존성 라인 */}
</svg>
```

---

**관련 문서**
- [이슈 관리](./issues.md)
- [프론트엔드 아키텍처](../architecture/frontend.md)
