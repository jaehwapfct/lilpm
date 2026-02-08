# 📦 서비스 레이어 (Services)

> Supabase 클라이언트와 비즈니스 로직을 캡슐화한 서비스 모듈

## 개요

서비스 레이어는 데이터 액세스와 비즈니스 로직을 React 컴포넌트로부터 분리합니다.

**디렉토리**: `src/lib/services/`

---

## 핵심 서비스

### issueService

**파일**: `src/lib/services/issue/`

```typescript
// 이슈 CRUD
await issueService.getIssues(teamId, filters?);
await issueService.getIssue(issueId);
await issueService.createIssue(teamId, data);
await issueService.updateIssue(issueId, data);
await issueService.deleteIssue(issueId);

// 이슈 일괄 처리
await issueService.bulkUpdate(issueIds, data);
await issueService.bulkMove(issueIds, projectId);

// 정렬 순서
await issueService.updateSortOrder(issueId, sortOrder);
```

---

### prdService

**파일**: `src/lib/services/prdService.ts`

```typescript
// PRD CRUD
await prdService.getPRDs(teamId, filters?);
await prdService.getPRD(prdId);
await prdService.createPRD(teamId, data);
await prdService.updatePRD(prdId, data);
await prdService.deletePRD(prdId);

// 프로젝트 연결
await prdService.getPRDsForProject(projectId);
await prdService.linkToProject(prdId, projectId);
await prdService.unlinkFromProject(prdId, projectId);
```

---

### projectService

**파일**: `src/lib/services/projectService.ts`

```typescript
await projectService.getProjects(teamId);
await projectService.getProject(projectId);
await projectService.createProject(teamId, data);
await projectService.updateProject(projectId, data);
await projectService.deleteProject(projectId);
```

---

### projectMemberService

**파일**: `src/lib/services/projectMemberService.ts`

```typescript
// 프로젝트 멤버 조회
await projectMemberService.getProjectMembers(projectId);
await projectMemberService.getUserProjects(userId, teamId?);

// 멤버 할당/해제 (Admin 전용)
await projectMemberService.assignMember(projectId, userId, role?);
await projectMemberService.unassignMember(projectId, userId);

// 멤버십 확인
await projectMemberService.isProjectMember(projectId, userId);
await projectMemberService.updateMemberRole(projectId, userId, role);
```

---

### teamService

**파일**: `src/lib/services/team/`

```typescript
// 팀 관리
await teamMemberService.getMembers(teamId);
await teamMemberService.addMember(teamId, userId, role);
await teamMemberService.removeMember(memberId);
await teamMemberService.updateMemberRole(memberId, role);

// 초대 관리
await teamInviteService.getInvites(teamId);
await teamInviteService.createInvite(teamId, email, role);
await teamInviteService.cancelInvite(inviteId);
await teamInviteService.acceptInvite(token);
```

---

### notificationService

**파일**: `src/lib/services/notificationService.ts`

```typescript
await notificationService.getNotifications(userId, { unreadOnly? });
await notificationService.markAsRead(notificationId);
await notificationService.markAllAsRead(userId);
await notificationService.createNotification(data);
await notificationService.deleteNotification(notificationId);
```

---

### conversationService

**파일**: `src/lib/services/conversationService.ts`

```typescript
// Lily 대화 관리
await conversationService.getConversations(teamId);
await conversationService.createConversation(teamId, title?);
await conversationService.updateConversation(conversationId, data);
await conversationService.deleteConversation(conversationId);

// 메시지
await conversationService.getMessages(conversationId);
await conversationService.addMessage(conversationId, message);

// 공유
await conversationService.shareConversation(conversationId, options);
```

---

### cycleService

**파일**: `src/lib/services/cycleService.ts`

```typescript
await cycleService.getCycles(teamId);
await cycleService.getCycle(cycleId);
await cycleService.createCycle(teamId, data);
await cycleService.updateCycle(cycleId, data);
await cycleService.deleteCycle(cycleId);
```

---

## 서비스 구조

```
services/
├── issue/              # 이슈 서비스 모듈
│   ├── index.ts
│   ├── queries.ts      # Supabase 쿼리
│   ├── mutations.ts    # 생성/수정/삭제
│   └── types.ts
├── team/               # 팀 서비스 모듈
│   ├── index.ts
│   ├── memberService.ts
│   └── inviteService.ts
├── projectService.ts
├── projectMemberService.ts
├── prdService.ts
├── notificationService.ts
├── conversationService.ts
└── index.ts            # 배럴 익스포트
```

---

## 에러 처리

모든 서비스는 Supabase 에러를 캐치하고 로깅합니다:

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
