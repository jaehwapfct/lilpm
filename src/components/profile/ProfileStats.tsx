import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Clock, Target, TrendingUp, Zap, Award } from 'lucide-react';
import type { Issue } from '@/types';

interface ProfileStatsProps {
  issues: Issue[];
  userId?: string;
}

export function ProfileStats({ issues, userId }: ProfileStatsProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const userIssues = issues.filter(i => i.assigneeId === userId);
    const createdIssues = issues.filter(i => i.creatorId === userId);
    const completedIssues = userIssues.filter(i => i.status === 'done');
    const inProgressIssues = userIssues.filter(i => i.status === 'in_progress');
    
    // Calculate streak (consecutive days with activity)
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const hasActivity = issues.some(issue => {
        const createdDate = new Date(issue.createdAt).toISOString().split('T')[0];
        const updatedDate = issue.updatedAt ? new Date(issue.updatedAt).toISOString().split('T')[0] : '';
        return (createdDate === dateStr || updatedDate === dateStr) && 
               (issue.creatorId === userId || issue.assigneeId === userId);
      });
      
      if (hasActivity) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Weekly completion rate
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekCompleted = completedIssues.filter(i => 
      i.updatedAt && new Date(i.updatedAt) > oneWeekAgo
    ).length;

    return {
      totalAssigned: userIssues.length,
      completed: completedIssues.length,
      inProgress: inProgressIssues.length,
      created: createdIssues.length,
      streak,
      thisWeekCompleted,
      completionRate: userIssues.length > 0 
        ? Math.round((completedIssues.length / userIssues.length) * 100) 
        : 0,
    };
  }, [issues, userId]);

  const statCards = [
    {
      icon: Target,
      label: t('profile.totalAssigned'),
      value: stats.totalAssigned,
      color: 'text-primary',
    },
    {
      icon: CheckCircle2,
      label: t('profile.completed'),
      value: stats.completed,
      color: 'text-green-500',
    },
    {
      icon: Clock,
      label: t('profile.inProgress'),
      value: stats.inProgress,
      color: 'text-blue-500',
    },
    {
      icon: Zap,
      label: t('profile.created'),
      value: stats.created,
      color: 'text-yellow-500',
    },
    {
      icon: Award,
      label: t('profile.streak'),
      value: `${stats.streak} ${t('profile.days')}`,
      color: 'text-orange-500',
    },
    {
      icon: TrendingUp,
      label: t('profile.completionRate'),
      value: `${stats.completionRate}%`,
      color: 'text-violet-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map(({ icon: Icon, label, value, color }) => (
        <Card key={label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
