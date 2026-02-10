import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusIcon, PriorityIcon } from '@/components/issues';
import { CalendarClock, ArrowRight, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, isToday, isTomorrow, isPast } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import type { Issue } from '@/types';

interface UpcomingDueIssuesProps {
  issues: Issue[];
  isLoading?: boolean;
}

export function UpcomingDueIssues({ issues, isLoading }: UpcomingDueIssuesProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ko' ? ko : enUS;

  // Filter issues with due dates and sort by due date
  const issuesWithDueDate = issues
    .filter(issue => issue.dueDate && issue.status !== 'done' && issue.status !== 'cancelled')
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const getDueDateLabel = (dueDate: string) => {
    const date = new Date(dueDate);
    
    if (isPast(date) && !isToday(date)) {
      const daysOverdue = Math.abs(differenceInDays(date, new Date()));
      return { 
        label: t('dashboard.overdue', { count: daysOverdue }), 
        variant: 'destructive' as const,
        isOverdue: true
      };
    }
    
    if (isToday(date)) {
      return { 
        label: t('dashboard.dueToday'), 
        variant: 'destructive' as const,
        isOverdue: false
      };
    }
    
    if (isTomorrow(date)) {
      return { 
        label: t('dashboard.dueTomorrow'), 
        variant: 'default' as const,
        isOverdue: false
      };
    }
    
    const daysUntil = differenceInDays(date, new Date());
    if (daysUntil <= 3) {
      return { 
        label: t('dashboard.dueInDays', { count: daysUntil }), 
        variant: 'secondary' as const,
        isOverdue: false
      };
    }
    
    return { 
      label: format(date, 'MMM d', { locale }), 
      variant: 'outline' as const,
      isOverdue: false
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            {t('dashboard.upcomingDue')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-4 w-4 rounded-full bg-[#121215]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-[#121215] rounded" />
                  <div className="h-3 w-1/2 bg-[#121215] rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-orange-500" />
          {t('dashboard.upcomingDue')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/issues?sort=due_date')}>
          {t('dashboard.viewAll')} <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {issuesWithDueDate.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('dashboard.noUpcomingDue')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issuesWithDueDate.map((issue) => {
              const { label, variant, isOverdue } = getDueDateLabel(issue.dueDate!);
              
              return (
                <div 
                  key={issue.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/issue/${issue.id}`)}
                >
                  <div className="mt-0.5">
                    <StatusIcon status={issue.status} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">
                        {issue.identifier}
                      </span>
                      <PriorityIcon priority={issue.priority} />
                    </div>
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {issue.title}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={variant} className={`text-xs ${isOverdue ? 'animate-pulse' : ''}`}>
                      {isOverdue && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {label}
                    </Badge>
                    
                    {issue.assignee && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={issue.assignee.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {issue.assignee.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
