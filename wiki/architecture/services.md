# 서비스 레이어 (Services)

> Supabase 클라이언트와 비즈니스 로직을 캡슐화한 서비스 모듈

## 개요

서비스 레이어는 데이터 액세스와 비즈니스 로직을 React 컴포넌트로부터 분리합니다. 두 가지 위치에 서비스가 존재합니다:

1. **`src/lib/services/`** - 공통/핵심 서비스 (팀, 알림, 대화, 사이클 등)
2. **`src/features/*/services/`** - 기능별 서비스 (이슈, PRD, 프로젝트)

## 서비스 맵

```
lib/services/                    # 공통 서비스
├── team/                        # 팀 관련
│   ├── teamService.ts           # 팀 CRUD
│   ├── teamMemberService.ts     # 멤버 관리
│   ├── teamInviteService.ts     # 초대 관리
│   └── profileService.ts        # 프로필 관리
├── activityService.ts           # 활동 피드
├── blockCommentService.ts       # 블록 레벨 댓글
├── conversationService.ts       # Lily 대화 관리
├── cycleService.ts              # 사이클/스프린트
└── notificationService.ts       # 알림

features/issues/services/        # 이슈 서비스
├── issue/
│   ├── issueService.ts          # 이슈 CRUD
│   ├── commentService.ts        # 이슈 댓글
│   ├── dependencyService.ts     # 이슈 의존성
│   ├── issueActivityService.ts  # 이슈 활동 로그
│   └── labelService.ts          # 라벨 관리
└── issueTemplateService.ts      # 이슈 템플릿

features/prd/services/           # PRD 서비스
├── prdService.ts                # PRD CRUD + 프로젝트 연결
└── prdVersionService.ts         # PRD 버전 히스토리

features/projects/services/      # 프로젝트 서비스
├── projectService.ts            # 프로젝트 CRUD
└── projectMemberService.ts      # 프로젝트 멤버 관리
```

---

## 공통 서비스

### teamService

```typescript
// lib/services/team/teamService.ts
await teamService.getTeams();                      // 사용자의 팀 목록 (team_members JOIN)
await teamService.getTeam(teamId);                 // 단일 팀 조회
await teamService.createTeam(name, slug);          // RPC create_team_with_owner
await teamService.updateTeam(teamId, data);        // 팀 수정
await teamService.deleteTeam(teamId);              // 팀 삭제
```

### teamMemberService

```typescript
// lib/services/team/teamMemberService.ts
await teamMemberService.getMembers(teamId);            // 멤버 목록 (profiles JOIN)
await teamMemberService.addMember(teamId, userId, role); // 멤버 추가
await teamMemberService.removeMember(memberId);        // 멤버 제거
await teamMemberService.updateMemberRole(memberId, role); // 역할 변경
await teamMemberService.leaveTeam(teamId, userId);     // 팀 탈퇴
```

### teamInviteService

```typescript
// lib/services/team/teamInviteService.ts
await teamInviteService.getInvites(teamId);              // 초대 목록
await teamInviteService.createInvite(teamId, email, role, projectIds?); // 초대 생성
await teamInviteService.cancelInvite(inviteId);          // 초대 취소
await teamInviteService.acceptInvite(token, userId?);    // 초대 수락 (accept-invite-v2 호출)
```

### cycleService

```typescript
// lib/services/cycleService.ts
await cycleService.getCycles(teamId);              // 사이클 목록
await cycleService.getCycle(cycleId);              // 단일 사이클
await cycleService.getActiveCycle(teamId);         // 활성 사이클
await cycleService.createCycle(teamId, data);      // 사이클 생성
await cycleService.updateCycle(cycleId, data);     // 사이클 수정
await cycleService.deleteCycle(cycleId);           // 사이클 삭제
await cycleService.getCycleIssues(cycleId);        // 사이클 이슈 목록
await cycleService.addIssueToCycle(issueId, cycleId);     // 이슈 할당
await cycleService.removeIssueFromCycle(issueId);  // 이슈 제거
```

### notificationService

```typescript
// lib/services/notificationService.ts
await notificationService.getNotifications(userId, { unreadOnly? });
await notificationService.markAsRead(notificationId);
await notificationService.markAllAsRead(userId);
await notificationService.createNotification(data);
await notificationService.deleteNotification(notificationId);
```

### conversationService

```typescript
// lib/services/conversationService.ts
await conversationService.getConversations(teamId);
await conversationService.createConversation(teamId, title?);
await conversationService.updateConversation(conversationId, data);
await conversationService.deleteConversation(conversationId);
await conversationService.getMessages(conversationId);
await conversationService.addMessage(conversationId, message);
await conversationService.shareConversation(conversationId, options);
```

### activityService

```typescript
// lib/services/activityService.ts
await activityService.getActivities(teamId, { limit?, entityType?, entityId? });
await activityService.logActivity(teamId, data);
```

### blockCommentService

```typescript
// lib/services/blockCommentService.ts
await blockCommentService.getComments(entityType, entityId);
await blockCommentService.createComment(data);
await blockCommentService.updateComment(commentId, content);
await blockCommentService.resolveComment(commentId);
await blockCommentService.addReply(commentId, content);
await blockCommentService.addReaction(commentId, emoji);
await blockCommentService.removeReaction(commentId, emoji);
```

---

## Feature 서비스

### issueService

```typescript
// features/issues/services/issue/issueService.ts
await issueService.getIssues(teamId, filters?);    // 이슈 목록 (필터, 관계 포함)
await issueService.getIssue(issueId);               // 단일 이슈 (상세)
await issueService.createIssue(teamId, data);        // 이슈 생성
await issueService.updateIssue(issueId, data);       // 이슈 수정
await issueService.deleteIssue(issueId);             // 이슈 삭제
await issueService.bulkUpdate(issueIds, data);       // 일괄 수정
await issueService.updateSortOrder(issueId, order);  // 정렬 순서
await issueService.getSubIssues(issueId);            // 서브이슈 목록
```

### commentService

```typescript
// features/issues/services/issue/commentService.ts
await commentService.getComments(issueId);
await commentService.createComment(issueId, content);
await commentService.updateComment(commentId, content);
await commentService.deleteComment(commentId);
```

### dependencyService

```typescript
// features/issues/services/issue/dependencyService.ts
await dependencyService.getDependencies(issueId);
await dependencyService.createDependency(blockingId, blockedId);
await dependencyService.deleteDependency(dependencyId);
```

### prdService

```typescript
// features/prd/services/prdService.ts
await prdService.getPRDs(teamId, filters?);
await prdService.getPRD(prdId);
await prdService.createPRD(teamId, data);
await prdService.updatePRD(prdId, data);  // content + overview 동시 업데이트
await prdService.deletePRD(prdId);
await prdService.getPRDsForProject(projectId);
await prdService.linkToProject(prdId, projectId);
await prdService.unlinkFromProject(prdId, projectId);
```

### prdVersionService

```typescript
// features/prd/services/prdVersionService.ts
await prdVersionService.getVersions(prdId);
await prdVersionService.createVersion(prdId, data);
await prdVersionService.restoreVersion(versionId);
```

### projectService

```typescript
// features/projects/services/projectService.ts
await projectService.getProjects(teamId);
await projectService.getProject(projectId);
await projectService.createProject(teamId, data);
await projectService.updateProject(projectId, data);
await projectService.deleteProject(projectId);
```

### projectMemberService

```typescript
// features/projects/services/projectMemberService.ts
await projectMemberService.getProjectMembers(projectId);
await projectMemberService.getUserProjects(userId, teamId?);
await projectMemberService.assignMember(projectId, userId, role?);
await projectMemberService.unassignMember(projectId, userId);
await projectMemberService.isProjectMember(projectId, userId);
await projectMemberService.updateMemberRole(projectId, userId, role);
```

---

## 에러 처리 패턴

```typescript
const { data, error } = await supabase.from('table').select();
if (error) {
  console.error('Service error:', error);
  throw error;
}
return data;
```

---

**관련 문서**
- [데이터베이스 스키마](./database.md)
- [Zustand 스토어](./stores.md)
- [API 설계](./api.md)
