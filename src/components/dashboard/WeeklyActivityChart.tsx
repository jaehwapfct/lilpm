import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import type { ActivityWithUser } from '@/types/database';

interface WeeklyActivityChartProps {
  activities: ActivityWithUser[];
  isLoading?: boolean;
}

export function WeeklyActivityChart({ activities, isLoading }: WeeklyActivityChartProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ko' ? ko : enUS;

  const chartData = useMemo(() => {
    const today = new Date();
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const count = activities.filter(activity => 
        isWithinInterval(new Date(activity.created_at), { start: dayStart, end: dayEnd })
      ).length;
      
      data.push({
        date: format(date, 'EEE', { locale }),
        fullDate: format(date, 'MMM d', { locale }),
        count,
        isToday: i === 0,
      });
    }
    
    return data;
  }, [activities, locale]);

  const totalActivities = chartData.reduce((sum, d) => sum + d.count, 0);
  const avgActivities = totalActivities / 7;
  
  // Calculate trend
  const firstHalf = chartData.slice(0, 3).reduce((sum, d) => sum + d.count, 0);
  const secondHalf = chartData.slice(4).reduce((sum, d) => sum + d.count, 0);
  const trend = secondHalf - firstHalf;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('dashboard.weeklyActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] animate-pulse bg-[#121215] rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          {t('dashboard.weeklyActivity')}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm">
          {trend > 0 ? (
            <span className="flex items-center text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              +{trend}
            </span>
          ) : trend < 0 ? (
            <span className="flex items-center text-red-500">
              <TrendingDown className="h-4 w-4 mr-1" />
              {trend}
            </span>
          ) : (
            <span className="flex items-center text-slate-400">
              <Minus className="h-4 w-4 mr-1" />
              0
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-[#1a1a1f] border border-white/10 rounded-xl shadow-md p-2 text-sm">
                        <p className="font-medium">{data.fullDate}</p>
                        <p className="text-slate-400">
                          {data.count} {t('dashboard.activities')}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="count" 
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isToday ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex justify-between mt-4 text-sm text-slate-400">
          <span>{t('dashboard.totalActivities')}: {totalActivities}</span>
          <span>{t('dashboard.avgPerDay')}: {avgActivities.toFixed(1)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
