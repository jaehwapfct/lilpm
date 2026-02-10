import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, eachDayOfInterval, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useLanguageStore } from '@/stores/languageStore';
import type { Issue } from '@/types/database';
import { TrendingDown, Target } from 'lucide-react';

interface BurndownChartProps {
  startDate: string;
  endDate: string;
  issues: Issue[];
  className?: string;
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  ideal: number;
  actual: number | null;
}

export function BurndownChart({ startDate, endDate, issues, className }: BurndownChartProps) {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const dateLocale = language === 'ko' ? ko : enUS;

  const chartData = useMemo(() => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const today = startOfDay(new Date());

    // Get all days in the cycle
    const allDays = eachDayOfInterval({ start, end });
    const totalIssues = issues.length;
    const dailyIdealBurn = totalIssues / (allDays.length - 1 || 1);

    // Calculate actual completion by date
    // Use updated_at as proxy for completion date when status is done
    const completionsByDate = new Map<string, number>();
    let cumulativeCompleted = 0;

    issues.forEach(issue => {
      if (issue.status === 'done' && issue.updated_at) {
        const completedDate = format(parseISO(issue.updated_at), 'yyyy-MM-dd');
        completionsByDate.set(
          completedDate,
          (completionsByDate.get(completedDate) || 0) + 1
        );
      }
    });

    return allDays.map((day, index) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dateLabel = format(day, 'M/d', { locale: dateLocale });

      // Ideal burndown line
      const ideal = Math.max(0, totalIssues - (dailyIdealBurn * index));

      // Actual burndown (only for past/current dates)
      let actual: number | null = null;
      if (!isAfter(day, today)) {
        cumulativeCompleted += completionsByDate.get(dateStr) || 0;
        actual = totalIssues - cumulativeCompleted;
      }

      return {
        date: dateStr,
        dateLabel,
        ideal: Math.round(ideal * 10) / 10,
        actual,
      };
    });
  }, [startDate, endDate, issues, dateLocale]);

  const completedIssues = issues.filter(i => i.status === 'done').length;
  const remainingIssues = issues.length - completedIssues;
  const velocity = chartData.filter(d => d.actual !== null).length > 1
    ? (completedIssues / (chartData.filter(d => d.actual !== null).length - 1)).toFixed(1)
    : '0';

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-5 w-5 text-violet-500" />
            {t('cycles.burndownChart')}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-violet-500/20 border-2 border-violet-500" />
              <span className="text-slate-400">{t('cycles.ideal')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-slate-400">{t('cycles.actual')}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-xl bg-[#121215]">
            <div className="text-2xl font-semibold text-white">{issues.length}</div>
            <div className="text-xs text-slate-400">{t('cycles.totalIssues')}</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-[#121215]">
            <div className="text-2xl font-semibold text-green-500">{completedIssues}</div>
            <div className="text-xs text-slate-400">{t('cycles.completed')}</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-[#121215]">
            <div className="text-2xl font-semibold text-orange-500">{remainingIssues}</div>
            <div className="text-xs text-slate-400">{t('cycles.remaining')}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="idealGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1f',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="ideal"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#idealGradient)"
                name={t('cycles.ideal')}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#actualGradient)"
                name={t('cycles.actual')}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Velocity Info */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Target className="h-4 w-4" />
            <span>{t('cycles.dailyVelocity')}: <span className="font-medium text-white">{velocity}</span> {t('cycles.issuesPerDay')}</span>
          </div>
          {remainingIssues > 0 && (
            <div className="text-slate-400">
              {t('cycles.projectedCompletion')}: {Math.ceil(remainingIssues / (parseFloat(velocity) || 1))} {t('cycles.daysLeft')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
