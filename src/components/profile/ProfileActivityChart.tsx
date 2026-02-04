import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { Issue } from '@/types';

interface ProfileActivityChartProps {
  issues: Issue[];
  userId?: string;
}

export function ProfileActivityChart({ issues, userId }: ProfileActivityChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayIssues = issues.filter(issue => {
        const createdDate = new Date(issue.createdAt).toISOString().split('T')[0];
        return createdDate === dateStr && issue.creatorId === userId;
      });

      const completedIssues = issues.filter(issue => {
        if (!issue.updatedAt || issue.status !== 'done') return false;
        const updatedDate = new Date(issue.updatedAt).toISOString().split('T')[0];
        return updatedDate === dateStr && issue.assigneeId === userId;
      });

      data.push({
        date: dateStr,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        created: dayIssues.length,
        completed: completedIssues.length,
      });
    }

    return data;
  }, [issues, userId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {t('profile.activityChart')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 10 }}
                interval={6}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area 
                type="monotone"
                dataKey="created" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary) / 0.3)"
                name={t('profile.issuesCreated')}
              />
              <Area 
                type="monotone"
                dataKey="completed" 
                stroke="hsl(142 76% 36%)" 
                fill="hsl(142 76% 36% / 0.3)"
                name={t('profile.issuesCompleted')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
