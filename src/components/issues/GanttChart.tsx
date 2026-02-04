import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  addMonths,
  subMonths,
  isWithinInterval,
  differenceInDays,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StatusIcon, PriorityIcon } from './IssueIcons';
import type { Issue } from '@/types';

interface GanttChartProps {
  issues: Issue[];
  onIssueClick?: (issue: Issue) => void;
}

export function GanttChart({ issues, onIssueClick }: GanttChartProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dateLocale = i18n.language === 'ko' ? ko : enUS;
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  
  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'month') {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      return { start, end, days: eachDayOfInterval({ start, end }) };
    } else {
      const start = startOfWeek(currentDate, { locale: dateLocale });
      const end = endOfWeek(addMonths(currentDate, 1), { locale: dateLocale });
      return { 
        start, 
        end, 
        days: eachDayOfInterval({ start, end }),
        weeks: eachWeekOfInterval({ start, end }, { locale: dateLocale })
      };
    }
  }, [currentDate, viewMode, dateLocale]);

  // Filter issues that have due dates
  const issuesWithDates = useMemo(() => {
    return issues
      .filter(issue => issue.dueDate)
      .sort((a, b) => {
        const dateA = new Date(a.dueDate!);
        const dateB = new Date(b.dueDate!);
        return dateA.getTime() - dateB.getTime();
      });
  }, [issues]);

  const handlePrevious = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNext = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getBarPosition = (dueDate: string) => {
    const date = new Date(dueDate);
    const dayIndex = differenceInDays(date, dateRange.start);
    const totalDays = dateRange.days.length;
    
    // Calculate position and width
    const left = Math.max(0, (dayIndex / totalDays) * 100);
    const width = (1 / totalDays) * 100;
    
    return {
      left: `${left}%`,
      width: `${Math.min(width * 3, 100 - left)}%`, // Bar spans 3 days or to end
      isVisible: dayIndex >= 0 && dayIndex < totalDays,
    };
  };

  const getStatusColor = (status: Issue['status']) => {
    switch (status) {
      case 'done':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'in_review':
        return 'bg-yellow-500';
      case 'todo':
        return 'bg-slate-400';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-slate-300';
    }
  };

  const handleIssueClick = (issue: Issue) => {
    if (onIssueClick) {
      onIssueClick(issue);
    } else {
      navigate(`/issues/${issue.id}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            {t('gantt.today', 'Today')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            {t('gantt.month', 'Month')}
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('week')}
          >
            {t('gantt.week', 'Week')}
          </Button>
        </div>
      </div>

      {/* Gantt Content */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* Timeline Header */}
          <div className="sticky top-0 z-10 bg-muted/50 backdrop-blur border-b border-border">
            <div className="flex">
              {/* Issue column header */}
              <div className="w-64 flex-shrink-0 px-4 py-2 border-r border-border font-medium text-sm">
                {t('gantt.issue', 'Issue')}
              </div>
              {/* Days header */}
              <div className="flex-1 flex">
                {dateRange.days.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex-1 min-w-[30px] text-center py-2 text-xs border-r border-border/50",
                      isToday(day) && "bg-primary/10",
                      !isSameMonth(day, currentDate) && "text-muted-foreground"
                    )}
                  >
                    <div className="font-medium">{format(day, 'd')}</div>
                    <div className="text-muted-foreground">{format(day, 'EEE', { locale: dateLocale })}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Issue Rows */}
          <div className="divide-y divide-border/50">
            {issuesWithDates.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <div className="text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t('gantt.noIssues', 'No issues with due dates')}</p>
                  <p className="text-sm mt-1">
                    {t('gantt.addDueDates', 'Add due dates to your issues to see them in the Gantt chart')}
                  </p>
                </div>
              </div>
            ) : (
              issuesWithDates.map((issue) => {
                const barPos = getBarPosition(issue.dueDate!);
                
                return (
                  <div key={issue.id} className="flex hover:bg-muted/30 transition-colors">
                    {/* Issue Info */}
                    <div
                      className="w-64 flex-shrink-0 px-4 py-3 border-r border-border cursor-pointer"
                      onClick={() => handleIssueClick(issue)}
                    >
                      <div className="flex items-center gap-2">
                        <StatusIcon status={issue.status} />
                        <span className="text-xs text-muted-foreground font-mono">
                          {issue.identifier}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate mt-1" title={issue.title}>
                        {issue.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <PriorityIcon priority={issue.priority} />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(issue.dueDate!), 'MMM d', { locale: dateLocale })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Timeline Bar */}
                    <div className="flex-1 relative py-3">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex">
                        {dateRange.days.map((day, index) => (
                          <div
                            key={index}
                            className={cn(
                              "flex-1 min-w-[30px] border-r border-border/30",
                              isToday(day) && "bg-primary/5"
                            )}
                          />
                        ))}
                      </div>
                      
                      {/* Issue Bar */}
                      {barPos.isVisible && (
                        <div
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-6 rounded-md cursor-pointer transition-all hover:opacity-80",
                            getStatusColor(issue.status)
                          )}
                          style={{ left: barPos.left, width: barPos.width, minWidth: '60px' }}
                          onClick={() => handleIssueClick(issue)}
                          title={`${issue.title} - Due: ${format(new Date(issue.dueDate!), 'PPP', { locale: dateLocale })}`}
                        >
                          <span className="px-2 text-xs text-white font-medium truncate block leading-6">
                            {issue.identifier}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-border px-4 py-2 bg-muted/30">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">{t('gantt.legend', 'Legend')}:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-slate-300" />
            <span>{t('status.backlog')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-slate-400" />
            <span>{t('status.todo')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>{t('status.in_progress')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>{t('status.in_review')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>{t('status.done')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

