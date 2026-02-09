import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Calendar, ArrowRight, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import type { Cycle, Issue } from '@/types/database';

interface CycleProgressCardProps {
  cycle: Cycle | null;
  issues: Issue[];
  isLoading?: boolean;
}

export function CycleProgressCard({ cycle, issues, isLoading }: CycleProgressCardProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ko' ? ko : enUS;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t('dashboard.currentSprint')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-1/2 bg-white/10 rounded" />
            <div className="h-4 w-full bg-white/10 rounded" />
            <div className="h-2 w-full bg-white/10 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cycle) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t('dashboard.currentSprint')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.noActiveSprint')}
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/cycles')}>
              {t('dashboard.sprintManagement')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = issues.filter(i => i.status === 'done').length;
  const progress = issues.length > 0 ? (completedCount / issues.length) * 100 : 0;
  const daysRemaining = differenceInDays(new Date(cycle.end_date), new Date());

  const getDaysRemainingLabel = () => {
    if (daysRemaining > 0) return `${daysRemaining} ${t('dashboard.daysRemaining')}`;
    if (daysRemaining === 0) return t('dashboard.endsToday');
    return t('dashboard.ended');
  };

  const issuesByStatus = {
    todo: issues.filter(i => i.status === 'todo' || i.status === 'backlog').length,
    inProgress: issues.filter(i => i.status === 'in_progress' || i.status === 'in_review').length,
    done: completedCount,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-green-500" />
            {t('dashboard.currentSprint')}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {getDaysRemainingLabel()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium">{cycle.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(cycle.start_date), 'MMM d', { locale })}
            <ArrowRight className="h-3 w-3" />
            {format(new Date(cycle.end_date), 'MMM d', { locale })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('dashboard.progress')}</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="text-center p-2 rounded-xl bg-[#1a1a1f]">
            <div className="text-lg font-semibold">{issuesByStatus.todo}</div>
            <div className="text-xs text-muted-foreground">{t('dashboard.todo')}</div>
          </div>
          <div className="text-center p-2 rounded-md bg-blue-500/10">
            <div className="text-lg font-semibold text-blue-500">{issuesByStatus.inProgress}</div>
            <div className="text-xs text-muted-foreground">{t('dashboard.inProgress')}</div>
          </div>
          <div className="text-center p-2 rounded-md bg-green-500/10">
            <div className="text-lg font-semibold text-green-500">{issuesByStatus.done}</div>
            <div className="text-xs text-muted-foreground">{t('dashboard.done')}</div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate(`/cycles`)}
        >
          {t('dashboard.viewSprintDetails')}
        </Button>
      </CardContent>
    </Card>
  );
}
