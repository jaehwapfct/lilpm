import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout';
import { useTeamStore } from '@/stores/teamStore';
import { projectService } from '@/lib/services/projectService';
import { issueService } from '@/lib/services/issueService';
import { teamMemberService } from '@/lib/services/teamService';
import { 
  ProjectStatsCard, 
  ProjectProgressChart, 
  ProjectMembersList,
  ProjectActivityTimeline,
  EditProjectModal 
} from '@/components/projects';
import { IssueRow } from '@/components/issues';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Settings, 
  Calendar, 
  Loader2,
  FolderOpen,
  ListTodo,
  BarChart3,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import type { Project, Issue, Profile } from '@/types/database';

const PROJECT_ICONS: Record<string, string> = {
  folder: '📁',
  rocket: '🚀',
  star: '⭐',
  lightning: '⚡',
  target: '🎯',
  gem: '💎',
  fire: '🔥',
  heart: '❤️',
};

const STATUS_COLORS: Record<string, string> = {
  backlog: '#6b7280',
  todo: '#3b82f6',
  in_progress: '#f59e0b',
  in_review: '#8b5cf6',
  done: '#22c55e',
  cancelled: '#ef4444',
};

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { currentTeam } = useTeamStore();
  
  const dateLocale = i18n.language === 'ko' ? ko : enUS;

  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [members, setMembers] = useState<{ profile: Profile; role: string; issueCount: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    
    setIsLoading(true);
    try {
      const projectData = await projectService.getProject(projectId);
      setProject(projectData);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const loadIssues = useCallback(async () => {
    if (!currentTeam?.id || !projectId) return;
    
    try {
      const allIssues = await issueService.getIssues(currentTeam.id, { project_id: projectId } as any);
      setIssues(allIssues);
    } catch (error) {
      console.error('Failed to load issues:', error);
    }
  }, [currentTeam?.id, projectId]);

  const loadMembers = useCallback(async () => {
    if (!currentTeam?.id) return;
    
    try {
      const membersData = await teamMemberService.getMembers(currentTeam.id);
      
      // Count issues per member
      const memberIssueCount = issues.reduce((acc, issue) => {
        if (issue.assignee_id) {
          acc[issue.assignee_id] = (acc[issue.assignee_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      setMembers(membersData.map((m) => ({
        profile: m.profile,
        role: m.role,
        issueCount: memberIssueCount[m.profile.id] || 0,
      })));
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }, [currentTeam?.id, issues]);

  useEffect(() => {
    loadProject();
    loadIssues();
  }, [loadProject, loadIssues]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Calculate stats
  const stats = {
    totalIssues: issues.length,
    completedIssues: issues.filter((i) => i.status === 'done').length,
    inProgressIssues: issues.filter((i) => i.status === 'in_progress').length,
    overdueIssues: issues.filter((i) => {
      if (!i.due_date) return false;
      return new Date(i.due_date) < new Date() && i.status !== 'done';
    }).length,
    memberCount: members.length,
  };

  // Status distribution for chart
  const statusData = [
    { status: 'backlog', count: issues.filter((i) => i.status === 'backlog').length, color: STATUS_COLORS.backlog },
    { status: 'todo', count: issues.filter((i) => i.status === 'todo').length, color: STATUS_COLORS.todo },
    { status: 'in_progress', count: issues.filter((i) => i.status === 'in_progress').length, color: STATUS_COLORS.in_progress },
    { status: 'in_review', count: issues.filter((i) => i.status === 'in_review').length, color: STATUS_COLORS.in_review },
    { status: 'done', count: issues.filter((i) => i.status === 'done').length, color: STATUS_COLORS.done },
    { status: 'cancelled', count: issues.filter((i) => i.status === 'cancelled').length, color: STATUS_COLORS.cancelled },
  ].filter((d) => d.count > 0);

  // Mock activities from issues
  const activities = issues.slice(0, 5).map((issue) => ({
    id: issue.id,
    type: 'issue_created' as const,
    user: {
      name: t('common.user'),
      avatarUrl: undefined,
    },
    issueTitle: issue.title,
    createdAt: issue.created_at,
  }));

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <FolderOpen className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">{t('projects.notFound')}</p>
          <Button onClick={() => navigate('/projects')}>{t('projects.backToList')}</Button>
        </div>
      </AppLayout>
    );
  }

  const icon = PROJECT_ICONS[project.icon || 'folder'] || '📁';

  return (
    <AppLayout>
      <div className="h-full overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur z-10 border-b border-border px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${project.color}20` }}
              >
                {icon}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold">{project.name}</h1>
                  <Badge variant="outline">{t(`projects.${project.status}`)}</Badge>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
                )}
                {(project.start_date || project.target_date) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    {project.start_date && format(new Date(project.start_date), 'PP', { locale: dateLocale })}
                    {project.start_date && project.target_date && ' → '}
                    {project.target_date && format(new Date(project.target_date), 'PP', { locale: dateLocale })}
                  </div>
                )}
              </div>
            </div>
            
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              {t('common.settings')}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-w-7xl mx-auto">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                {t('projects.overview')}
              </TabsTrigger>
              <TabsTrigger value="issues" className="gap-1.5">
                <ListTodo className="h-4 w-4" />
                {t('issues.title')} ({issues.length})
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-1.5">
                <Users className="h-4 w-4" />
                {t('projects.members')} ({members.length})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProjectStatsCard stats={stats} />
                <ProjectProgressChart data={statusData} />
              </div>
              <ProjectActivityTimeline activities={activities} />
            </TabsContent>

            {/* Issues Tab */}
            <TabsContent value="issues">
              <div className="divide-y divide-border rounded-lg border">
                {issues.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{t('issues.noIssues')}</p>
                  </div>
                ) : (
                  issues.map((issue) => (
                    <div 
                      key={issue.id}
                      className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/issue/${issue.id}`)}
                    >
                      <IssueRow
                        issue={issue as any}
                        isSelected={false}
                        onSelect={() => {}}
                      />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members">
              <ProjectMembersList 
                members={members as any}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Modal */}
        <EditProjectModal
          project={project}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={loadProject}
        />
      </div>
    </AppLayout>
  );
}
