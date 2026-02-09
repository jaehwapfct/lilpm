import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { IssueStatus, IssuePriority } from '@/types';

interface IssueData {
  status: IssueStatus;
  priority: IssuePriority;
}

interface IssueStatsChartProps {
  issues: IssueData[];
  type?: 'status' | 'priority';
}

const STATUS_COLORS = {
  backlog: 'hsl(var(--muted-foreground))',
  todo: 'hsl(220, 70%, 60%)',
  in_progress: 'hsl(45, 90%, 55%)',
  in_review: 'hsl(280, 65%, 55%)',
  done: 'hsl(142, 70%, 45%)',
  cancelled: 'hsl(0, 0%, 50%)',
};

const PRIORITY_COLORS = {
  urgent: 'hsl(0, 85%, 55%)',
  high: 'hsl(25, 90%, 55%)',
  medium: 'hsl(45, 90%, 55%)',
  low: 'hsl(210, 70%, 55%)',
  none: 'hsl(var(--muted-foreground))',
};

export function IssueStatsChart({ issues, type = 'status' }: IssueStatsChartProps) {
  const { t } = useTranslation();

  const colors = type === 'status' ? STATUS_COLORS : PRIORITY_COLORS;
  const field = type === 'status' ? 'status' : 'priority';
  const keys = type === 'status'
    ? ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']
    : ['urgent', 'high', 'medium', 'low', 'none'];

  const data = keys.map((key) => ({
    name: t(`${type}.${key}`),
    value: issues.filter(i => i[field] === key).length,
    color: colors[key as keyof typeof colors],
  })).filter(d => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const title = type === 'status' ? t('dashboard.statusDistribution') : t('dashboard.priorityDistribution');

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            {t('common.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#1a1a1f] border border-white/10 rounded-xl shadow-lg p-2 text-sm">
                        <p className="font-medium">{d.name}</p>
                        <p className="text-muted-foreground">
                          {d.value} ({Math.round((d.value / total) * 100)}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span>{d.name}</span>
              <span className="text-muted-foreground">({d.value})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
