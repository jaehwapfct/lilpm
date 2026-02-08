# 프로젝트 멤버 할당 (Project Members)

> 프로젝트별로 팀 멤버의 접근 권한을 관리하는 시스템

## 개요

프로젝트 멤버 시스템은 **프로젝트 단위**로 팀 멤버의 접근 권한을 제어합니다. 할당되지 않은 멤버는 해당 프로젝트와 관련 이슈를 볼 수 없습니다.

---

## 데이터 모델

### project_members 테이블

```sql
CREATE TABLE project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('lead', 'member', 'viewer')),
  assigned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(project_id, user_id)
);
```

### 역할 (Role)

| 역할 | 설명 |
|------|------|
| `lead` | 프로젝트 리더 - 모든 권한 |
| `member` | 일반 멤버 - 읽기/쓰기 |
| `viewer` | 뷰어 - 읽기 전용 |

---

## RLS (Row Level Security)

### 프로젝트 조회 정책

```sql
CREATE POLICY "Users can view projects they are assigned to"
  ON projects FOR SELECT
  USING (
    -- 프로젝트에 할당된 멤버
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
    )
    OR
    -- 팀 admin/owner는 모든 프로젝트 조회 가능
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = projects.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );
```

### 이슈 조회 정책

프로젝트에 속한 이슈도 동일한 접근 제어가 적용됩니다.

---

## 서비스 레이어

### projectMemberService

**파일**: `src/lib/services/projectMemberService.ts`

```typescript
// 프로젝트 멤버 조회
await projectMemberService.getProjectMembers(projectId);

// 사용자의 할당된 프로젝트 조회
await projectMemberService.getUserProjects(userId, teamId?);

// 멤버 할당
await projectMemberService.assignMember(projectId, userId, role?);

// 멤버 해제
await projectMemberService.unassignMember(projectId, userId);

// 멤버십 확인
await projectMemberService.isProjectMember(projectId, userId);
```

---

## UI 컴포넌트

### ProjectAssignmentModal

**파일**: `src/components/team/ProjectAssignmentModal.tsx`

팀 멤버 페이지에서 각 멤버의 프로젝트 할당을 관리하는 모달입니다.

**주요 기능**:
- 체크박스로 프로젝트 할당/해제
- 변경사항 일괄 저장
- 프로젝트 상태 배지 표시

**사용 방법**:
```tsx
<ProjectAssignmentModal
  open={isOpen}
  onOpenChange={setIsOpen}
  member={selectedMember}
  teamId={currentTeam.id}
/>
```

---

## 자동 할당

### 새 팀 멤버 자동 할당

새로운 팀 멤버가 가입하면 해당 팀의 모든 기존 프로젝트에 자동으로 할당됩니다.

```sql
CREATE TRIGGER trigger_auto_assign_projects
  AFTER INSERT ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_new_team_member_to_projects();
```

### 기존 데이터 마이그레이션

마이그레이션 적용 시 기존 팀 멤버들은 모든 프로젝트에 자동 할당됩니다.

---

## 접근 거부 처리

### ProjectDetailPage

할당되지 않은 사용자가 프로젝트에 접근하면:

1. RLS에 의해 프로젝트 데이터가 null로 반환
2. "프로젝트를 찾을 수 없거나 접근 권한이 없습니다" 메시지 표시
3. 프로젝트 목록으로 돌아가기 버튼 제공

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `supabase/migrations/20260208190000_project_members.sql` | DB 마이그레이션 |
| `src/lib/services/projectMemberService.ts` | 서비스 레이어 |
| `src/types/database.ts` | `ProjectMember` 타입 정의 |
| `src/components/team/ProjectAssignmentModal.tsx` | UI 컴포넌트 |
| `src/pages/TeamMembersPage.tsx` | 모달 통합 |
| `src/pages/ProjectDetailPage.tsx` | 접근 거부 UI |
