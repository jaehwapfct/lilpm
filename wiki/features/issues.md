# 🎫 이슈 관리

> 백로그에서 완료까지, 프로젝트 작업을 체계적으로 관리하세요.

## 개요

Lil PM의 이슈 관리 시스템은 Linear.app의 UX를 기반으로 설계되었습니다. 이슈 생성, 상태 관리, 필터링, 검색 등 모든 기능을 직관적인 UI로 제공합니다.

## 이슈 상태

| 상태 | 아이콘 | 설명 |
|------|--------|------|
| Backlog | 📋 | 아직 시작하지 않은 작업 |
| Todo | ⭕ | 곧 시작할 예정인 작업 |
| In Progress | 🔵 | 현재 진행 중인 작업 |
| In Review | 👀 | 검토 중인 작업 |
| Blocked | 🚫 | 차단된 작업 |
| Done | ✅ | 완료된 작업 |
| Cancelled | ❌ | 취소된 작업 |

## 우선순위

| 우선순위 | 아이콘 | 설명 |
|----------|--------|------|
| Urgent | 🔴 | 즉시 처리 필요 |
| High | 🟠 | 우선 처리 |
| Medium | 🟡 | 일반적인 우선순위 |
| Low | 🟢 | 여유있게 처리 |
| No Priority | ⚪ | 우선순위 미지정 |

## 이슈 타입

| 타입 | 아이콘 | 설명 |
|------|--------|------|
| Epic | 🎯 | 대규모 기능 또는 목표 |
| User Story | 👤 | 사용자 관점의 요구사항 |
| Task | ✅ | 일반 작업 |
| Subtask | 📎 | 하위 작업 |
| Bug | 🐛 | 버그/결함 |

## 주요 기능

### 1. 이슈 생성

- **빠른 생성**: `Cmd/Ctrl + K` 또는 `+` 버튼
- **필수 항목**: 제목만 필수, 나머지는 선택
- **자동 할당**: 생성자에게 자동 담당자 지정 (설정 가능)
- **템플릿**: 사전 정의된 템플릿으로 빠른 생성

### 2. 이슈 뷰

| 뷰 | 설명 |
|----|------|
| 리스트 뷰 | 기본 테이블 형태 |
| 보드 뷰 | 칸반 스타일 |
| 간트 차트 | 타임라인 뷰 ([자세히 보기](./gantt-chart.md)) |

### 3. 필터링

```
필터 조합 예시:
- 상태: In Progress + 담당자: 나 → 내 진행중인 이슈
- 우선순위: Urgent/High + 프로젝트: 특정 프로젝트 → 급한 이슈
```

### 4. 이슈-관계 연결

이슈를 다양한 엔티티와 연결할 수 있습니다:

#### 싸이클(스프린트) 연결 (IssueDetailPage.tsx lines 1223-1270)

```tsx
<Select
  value={issue.cycle_id || 'none'}
  onValueChange={async (v) => {
    if (v === 'none') {
      await cycleService.removeIssueFromCycle(issue.id);
      setIssue(prev => ({ ...prev, cycle_id: null }));
    } else {
      await cycleService.addIssueToCycle(issue.id, v);
      setIssue(prev => ({ ...prev, cycle_id: v }));
    }
    toast.success('Sprint updated');
  }}
>
  <SelectContent>
    <SelectItem value="none">No sprint</SelectItem>
    {cycles.map((cycle) => (
      <SelectItem key={cycle.id} value={cycle.id}>
        {cycle.name} ({format(cycle.start_date)} - {format(cycle.end_date)})
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

#### PRD 연결 (IssueDetailPage.tsx lines 1287-1327)

```tsx
<Select
  value={issue.prd_id || 'none'}
  onValueChange={async (v) => {
    const newPrdId = v === 'none' ? null : v;
    await issueService.updateIssue(issue.id, { prd_id: newPrdId });
    setIssue(prev => ({ ...prev, prd_id: newPrdId }));
    toast.success('Linked PRD updated');
  }}
>
  <SelectContent>
    <SelectItem value="none">No linked PRD</SelectItem>
    {prds.map((prd) => (
      <SelectItem key={prd.id} value={prd.id}>
        📄 {prd.title}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### 5. 실시간 저장

- 모든 변경사항 자동 저장 (2초 디바운스)
- 저장 상태 표시: ☁️ 저장됨 / 🔄 저장중 / ⚠️ 미저장

## 데이터베이스 스키마

### issues 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid | PK |
| team_id | uuid | FK → teams |
| project_id | uuid | FK → projects |
| cycle_id | uuid | FK → cycles (스프린트) |
| **prd_id** | uuid | FK → prd_documents (연결된 PRD) |
| parent_id | uuid | FK → issues (상위 이슈) |
| identifier | text | 이슈 번호 (예: LPM-123) |
| title | text | 제목 |
| description | text | 설명 (마크다운) |
| type | text | epic/user_story/task/subtask/bug |
| status | text | backlog/todo/in_progress/in_review/blocked/done/cancelled |
| priority | text | urgent/high/medium/low/none |
| assignee_id | uuid | 담당자 |
| creator_id | uuid | 생성자 |
| start_date | timestamp | 시작일 |
| due_date | timestamp | 마감일 |
| estimate | integer | 예상 공수 (스토리 포인트) |
| sort_order | float | 정렬 순서 |
| created_at | timestamp | 생성일 |
| updated_at | timestamp | 수정일 |

## 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| `Cmd/Ctrl + K` | 빠른 이슈 생성 |
| `Cmd/Ctrl + /` | 전역 검색 |
| `↑/↓` | 이슈 네비게이션 |
| `Enter` | 이슈 상세 열기 |
| `Esc` | 닫기/취소 |

## API 참조

```typescript
// src/lib/services/issueService.ts

getIssues(teamId: string, filters?: IssueFilters): Promise<Issue[]>
createIssue(teamId: string, issue: CreateIssueInput): Promise<Issue>
updateIssue(issueId: string, updates: Partial<Issue>): Promise<Issue>
deleteIssue(issueId: string): Promise<void>
```

## 스토어

```typescript
// src/stores/issueStore.ts
interface IssueStore {
  issues: Issue[];
  isLoading: boolean;
  loadIssues(teamId: string): Promise<void>;
  createIssue(teamId: string, issue: CreateIssueInput): Promise<Issue>;
  updateIssue(issueId: string, updates: Partial<Issue>): Promise<void>;
}
```

---

**관련 문서**
- [간트 차트](./gantt-chart.md)
- [Lily AI](./lily-ai.md)
- [사이클](./cycles.md)
- [PRD](./prd.md)
