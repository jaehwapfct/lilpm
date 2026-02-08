# 프로젝트 (Projects)

> 프로젝트 생성, 관리, 이슈/PRD 연동 기능

## 개요

프로젝트는 관련된 이슈와 PRD를 그룹화하는 단위입니다. Linear.app의 프로젝트 기능을 기반으로 구현되었습니다.

---

## 주요 기능

### 프로젝트 상세 페이지

**파일**: `src/pages/ProjectDetailPage.tsx`

#### 탭 구성

| 탭 | 내용 |
|----|------|
| Overview | 프로젝트 통계, 진행 차트, 멤버, 활동 타임라인 |
| Issues | 프로젝트에 속한 이슈 목록 |
| PRDs | 프로젝트에 연결된 PRD 목록 |
| Members | 프로젝트 멤버 (할당된 팀 멤버) |

#### 탭 상태 기억

마지막으로 본 탭을 `localStorage`에 저장하여 페이지 재방문 시 복원합니다.

```typescript
const [activeTab, setActiveTab] = useState(() => {
  return localStorage.getItem(`project-${projectId}-lastTab`) || 'overview';
});

const handleTabChange = (tab: string) => {
  setActiveTab(tab);
  localStorage.setItem(`project-${projectId}-lastTab`, tab);
};
```

---

## 이슈/PRD 생성 버튼

### Issues 탭

| 버튼 | 동작 |
|------|------|
| **새 이슈** | `/issue/new?projectId={id}` 로 이동 |
| **AI로 작성** | `/lily?context=project&projectId={id}&type=issue` 로 이동 |

### PRDs 탭

| 버튼 | 동작 |
|------|------|
| **새 PRD** | `/prd/new?projectId={id}` 로 이동 |
| **AI로 작성** | `/lily?context=project&projectId={id}&type=prd` 로 이동 |

---

## AI 연동

### Lily 프로젝트 컨텍스트

프로젝트에서 "AI로 작성" 버튼을 클릭하면 Lily 페이지로 이동하며, 프로젝트 정보가 URL 파라미터로 전달됩니다:

```
/lily?context=project&projectId={id}&projectName={name}&type=issue|prd
```

### AI 인사말

Lily가 프로젝트 컨텍스트를 인식하면 자동으로 인사말을 표시합니다:

> "안녕하세요! **프로젝트명** 프로젝트에 들어갈 이슈를 함께 작성해 드리겠습니다. 어떤 이슈를 만들어 드릴까요?"

**구현 파일**:
- `src/pages/LilyPage.tsx` - URL 파라미터 파싱
- `src/components/lily/LilyChat.tsx` - 인사말 표시 로직

---

## 반응형 레이아웃

프로젝트 상세 페이지는 전체 너비를 사용합니다:

```tsx
// 변경 전
<div className="max-w-7xl mx-auto">

// 변경 후
<div className="w-full">
```

---

## 관련 컴포넌트

### 프로젝트 통계 카드

**파일**: `src/components/projects/ProjectStatsCard.tsx`

| 통계 | 설명 |
|------|------|
| 전체 이슈 | 프로젝트에 속한 이슈 수 |
| 완료됨 | 상태가 `done`인 이슈 |
| 진행중 | 상태가 `in_progress`인 이슈 |
| 지연 | 마감일이 지난 미완료 이슈 |
| 멤버 수 | 프로젝트에 할당된 멤버 |

### 진행 차트

**파일**: `src/components/projects/ProjectProgressChart.tsx`

상태별 이슈 분포를 파이 차트로 표시합니다.

### 프로젝트 편집 모달

**파일**: `src/components/projects/EditProjectModal.tsx`

프로젝트 이름, 설명, 색상, 상태, 날짜를 편집합니다.

---

## 서비스 레이어

### projectService

**파일**: `src/lib/services/projectService.ts`

```typescript
// 프로젝트 목록 조회
await projectService.getProjects(teamId);

// 단일 프로젝트 조회
await projectService.getProject(projectId);

// 프로젝트 생성
await projectService.createProject(teamId, data);

// 프로젝트 업데이트
await projectService.updateProject(projectId, data);

// 프로젝트 삭제
await projectService.deleteProject(projectId);
```

---

## 관련 문서

- [프로젝트 멤버](./project-members.md) - 멤버별 접근 권한 관리
- [이슈 관리](./issues.md) - 프로젝트에 속한 이슈
- [PRD](./prd.md) - 프로젝트에 연결된 PRD
- [Lily AI](./lily-ai.md) - AI 연동 기능
