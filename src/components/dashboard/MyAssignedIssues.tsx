import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Issue } from '@/types';

interface MyAssignedIssuesProps {
  issues: Issue[];
  userId?: string;
  isLoading?: boolean;
}

export function MyAssignedIssues({ issues, userId, isLoading }: MyAssignedIssuesProps) {
  const { t } = useTranslation();

  const myIssues = issues
    .filter(issue => issue.assigneeId === userId && issue.status !== 'done')
    .slice(0, 5);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-primary/10 text-primary';
      case 'in_review': return 'bg-purple-500/10 text-purple-500';
      case 'todo': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.myTasks')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (myIssues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.myTasks')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{t('dashboard.noAssignedTasks')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          {t('dashboard.myTasks')}
          <Badge variant="secondary">{myIssues.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {myIssues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            >
              <div className={cn("h-2 w-2 rounded-full mt-2", getStatusColor(issue.status))} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{issue.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn("text-xs", getPriorityColor(issue.priority))}>
                    {t(`priority.${issue.priority}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {issue.identifier}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
