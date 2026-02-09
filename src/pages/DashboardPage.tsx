import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout';
import { useTeamStore } from '@/stores/teamStore';
import { useIssueStore } from '@/stores';
import { useAuthStore } from '@/stores/authStore';
import { cycleService } from '@/lib/services/cycleService';
import { activityService } from '@/lib/services';
import { 
  ActivityFeed, 
  AIHeroCard,
  CycleProgressCard, 
  IssueStatsChart, 
  MyAssignedIssues,
  ProjectsOverview,
  QuickActionsCard,
  TeamOverviewCard,
  UpcomingDueIssues,
  WeeklyActivityChart 
} from '@/components/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusIcon, allStatuses } from '@/components/issues';
import { 
  Inbox, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Users,
  FolderKanban,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Target,
} from 'lucide-react';
import type { Cycle, ActivityWithUser, Issue as DbIssue } from '@/types/database';

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currentTeam, members, projects } = useTeamStore();
  const { issues, loadIssues } = useIssueStore();
  const [activeCycle, setActiveCycle] = useState<Cycle | null>(null);
  const [cycleIssues, setCycleIssues] = useState<DbIssue[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityWithUser[]>([]);
  const [allActivities, setAllActivities] = useState<ActivityWithUser[]>([]);
  const [isLoadingExtra, setIsLoadingExtra] = useState(true);

  useEffect(() => {
    if (currentTeam) {
      loadIssues(currentTeam.id);
    }
  }, [currentTeam, loadIssues]);

  const loadExtraData = useCallback(async () => {
    if (!currentTeam?.id) return;

    setIsLoadingExtra(true);
    try {
      const cycle = await cycleService.getActiveCycle(currentTeam.id);
      setActiveCycle(cycle);

      if (cycle) {
        const cycleIssuesData = await cycleService.getCycleIssues(cycle.id);
        setCycleIssues(cycleIssuesData);
      }

      if (issues.length > 0) {
        const activitiesPromises = issues.slice(0, 10).map(issue => 
          activityService.getActivities(issue.id)
        );
        const allActivitiesData = await Promise.all(activitiesPromises);
        const flatActivities = allActivitiesData.flat().sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setAllActivities(flatActivities);
        setRecentActivities(flatActivities.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to load extra data:', error);
    } finally {
      setIsLoadingExtra(false);
    }
  }, [currentTeam?.id, issues]);

  useEffect(() => {
    loadExtraData();
  }, [loadExtraData]);

  // Calculate stats
  const totalIssues = issues.length;
  const todoIssues = issues.filter(i => i.status === 'todo').length;
  const inProgressIssues = issues.filter(i => i.status === 'in_progress').length;
  const doneIssues = issues.filter(i => i.status === 'done').length;
  const urgentIssues = issues.filter(i => i.priority === 'urgent' || i.priority === 'high').length;

  // Calculate weekly completion
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const completedThisWeek = issues.filter(i => 
    i.status === 'done' && new Date(i.updatedAt) > oneWeekAgo
  ).length;

  const issuesByStatus = allStatuses.map(status => ({
    status,
    count: issues.filter(i => i.status === status).length,
  }));

  // Calculate completion rate
  const completionRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* AI Hero Card - Main focus */}
        <AIHeroCard userName={user?.name} />
        
        {/* Team Overview - Smaller */}
        <TeamOverviewCard 
          teamName={currentTeam?.name || ''}
          user={user}
          totalIssues={totalIssues}
          completedThisWeek={completedThisWeek}
          activeMembers={members.length}
        />

        {/* Stats Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/issues')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('dashboard.totalIssues')}</CardTitle>
              <Inbox className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl font-bold">{totalIssues}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {todoIssues + inProgressIssues} {t('dashboard.activeIssues')}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/issues?status=in_progress')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('dashboard.inProgress')}</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl font-bold">{inProgressIssues}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {t('dashboard.currentlyWorking')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('dashboard.completed')}</CardTitle>
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl font-bold">{doneIssues}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {t('dashboard.completedIssues')}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors hidden sm:block" onClick={() => navigate('/issues?priority=urgent,high')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('dashboard.urgentHigh')}</CardTitle>
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl font-bold">{urgentIssues}</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.needsAttention')}
              </p>
            </CardContent>
          </Card>

          <Card className="hidden lg:block">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{t('dashboard.completionRate')}</CardTitle>
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl sm:text-2xl font-bold">{completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {t('dashboard.overallProgress')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Left Column - Charts & Issues */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Issue Distribution */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <IssueStatsChart issues={issues} type="status" />
              <IssueStatsChart issues={issues} type="priority" />
            </div>

            {/* Weekly Activity Chart */}
            <WeeklyActivityChart 
              activities={allActivities}
              isLoading={isLoadingExtra}
            />

            {/* Upcoming Due Issues */}
            <UpcomingDueIssues 
              issues={issues}
              isLoading={isLoadingExtra}
            />

            {/* Issues by Status Bar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t('dashboard.issuesByStatus')}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/issues')}>
                  {t('dashboard.viewAll')} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {issuesByStatus.map(({ status, count }) => (
                    <div key={status} className="flex items-center gap-4">
                      <StatusIcon status={status} />
                      <span className="flex-1 text-sm">{t(`status.${status}`)}</span>
                      <span className="text-sm font-medium">{count}</span>
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{
                            width: totalIssues > 0 ? `${(count / totalIssues) * 100}%` : '0%',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Widgets */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Actions */}
            <QuickActionsCard />

            {/* My Assigned Issues */}
            <MyAssignedIssues 
              issues={issues}
              userId={user?.id}
              isLoading={isLoadingExtra}
            />

            {/* Active Sprint */}
            <CycleProgressCard 
              cycle={activeCycle} 
              issues={cycleIssues}
              isLoading={isLoadingExtra}
            />

            {/* Projects Overview */}
            <ProjectsOverview 
              projects={projects}
              issues={issues}
              isLoading={isLoadingExtra}
            />

            {/* Recent Activity */}
            <ActivityFeed 
              activities={recentActivities}
              isLoading={isLoadingExtra}
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/team/members')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.teamMembers')}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{members.length}</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/projects')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('dashboard.projects')}</CardTitle>
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{projects.length}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
