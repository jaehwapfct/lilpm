import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Folder, ArrowRight } from 'lucide-react';
import type { Project, Issue } from '@/types';

interface ProjectsOverviewProps {
  projects: Project[];
  issues: Issue[];
  isLoading?: boolean;
}

export function ProjectsOverview({ projects, issues, isLoading }: ProjectsOverviewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getProjectStats = (projectId: string) => {
    const projectIssues = issues.filter(i => i.projectId === projectId);
    const total = projectIssues.length;
    const done = projectIssues.filter(i => i.status === 'done').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, progress };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-[#121215]';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.projectsOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-[#121215] animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeProjects = projects.filter(p => p.status !== 'completed').slice(0, 4);

  if (activeProjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.projectsOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-400">
            <Folder className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('projects.noProjects')}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => navigate('/projects')}
            >
              {t('projects.createProject')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t('dashboard.projectsOverview')}</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
          {t('dashboard.viewAll')} <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeProjects.map((project) => {
            const stats = getProjectStats(project.id);
            return (
              <div
                key={project.id}
                className="p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: project.color || 'hsl(var(--primary))' }}
                    />
                    <span className="font-medium text-sm">{project.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {stats.done}/{stats.total}
                  </Badge>
                </div>
                <Progress value={stats.progress} className="h-1.5" />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">
                    {stats.progress}% {t('dashboard.completed').toLowerCase()}
                  </span>
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(project.status)}`} />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
