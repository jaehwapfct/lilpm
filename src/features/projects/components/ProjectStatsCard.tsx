import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users
} from 'lucide-react';

interface ProjectStats {
  totalIssues: number;
  completedIssues: number;
  inProgressIssues: number;
  overdueIssues: number;
  memberCount: number;
}

interface ProjectStatsCardProps {
  stats: ProjectStats;
  className?: string;
}

export function ProjectStatsCard({ stats, className }: ProjectStatsCardProps) {
  const { t } = useTranslation();

  const completionRate = stats.totalIssues > 0
    ? Math.round((stats.completedIssues / stats.totalIssues) * 100)
    : 0;

  const statItems = [
    {
      label: t('dashboard.totalIssues'),
      value: stats.totalIssues,
      icon: Circle,
      color: 'text-slate-400',
    },
    {
      label: t('dashboard.inProgress'),
      value: stats.inProgressIssues,
      icon: Clock,
      color: 'text-blue-500',
    },
    {
      label: t('dashboard.completed'),
      value: stats.completedIssues,
      icon: CheckCircle2,
      color: 'text-green-500',
    },
    {
      label: t('notifications.overdue'),
      value: stats.overdueIssues,
      icon: AlertTriangle,
      color: 'text-destructive',
    },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {t('projects.statistics')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">{t('dashboard.progress')}</span>
            <span className="font-medium">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded-xl bg-[#121215]">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <div>
                <p className="text-lg font-semibold">{item.value}</p>
                <p className="text-xs text-slate-400">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Members */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-400">
            {t('projects.memberCount', { count: stats.memberCount })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
