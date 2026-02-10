# 대시보드

> 팀의 현재 상태를 한눈에 파악하세요.

## 개요

대시보드는 프로젝트의 전반적인 진행 상황, 이슈 통계, 활동 피드를 위젯 기반으로 제공합니다.

**파일**: `src/pages/DashboardPage.tsx`

## 위젯 구성

| 위젯 | 파일 | 설명 |
|------|------|------|
| **AI Hero Card** | `AIHeroCard.tsx` | Lily AI 인사말 + 빠른 액션 |
| **Team Overview** | `TeamOverviewCard.tsx` | 팀원 수, 활성 프로젝트 수 |
| **Issue Stats** | `IssueStatsChart.tsx` | 이슈 통계 (전체, 진행중, 완료, 긴급, 완료율) |
| **Weekly Activity** | `WeeklyActivityChart.tsx` | 주간 활동 차트 (Recharts) |
| **Quick Actions** | `QuickActionsCard.tsx` | 빠른 생성 버튼 (이슈, PRD, 사이클) |
| **My Assigned** | `MyAssignedIssues.tsx` | 내게 할당된 이슈 목록 |
| **Cycle Progress** | `CycleProgressCard.tsx` | 활성 스프린트 진행률 |
| **Projects Overview** | `ProjectsOverview.tsx` | 프로젝트 목록 + 진행 상태 |
| **Activity Feed** | `ActivityFeed.tsx` | 최근 활동 피드 |
| **Upcoming Due** | `UpcomingDueIssues.tsx` | 마감 임박 이슈 |

## 데이터 소스

```typescript
// DashboardPage.tsx
const activeCycle = await cycleService.getActiveCycle(teamId);
const cycleIssues = await cycleService.getCycleIssues(activeCycle.id);
const activities = await activityService.getActivities(teamId, { limit: 20 });
const issues = useIssueStore().issues;
```

## 이슈 통계 계산

```typescript
const stats = {
  total: issues.length,
  inProgress: issues.filter(i => i.status === 'in_progress').length,
  completed: issues.filter(i => i.status === 'done').length,
  urgent: issues.filter(i => i.priority === 'urgent').length,
  completionRate: (completed / total * 100).toFixed(1),
};
```

---

**관련 문서**
- [이슈 관리](./issues.md)
- [사이클](./cycles.md)
