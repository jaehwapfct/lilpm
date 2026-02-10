import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { BarChart3 } from 'lucide-react';

interface StatusData {
  status: string;
  count: number;
  color: string;
}

interface ProjectProgressChartProps {
  data: StatusData[];
  className?: string;
}

export function ProjectProgressChart({ data, className }: ProjectProgressChartProps) {
  const { t } = useTranslation();

  const statusLabels: Record<string, string> = {
    backlog: t('status.backlog'),
    todo: t('status.todo'),
    in_progress: t('status.in_progress'),
    in_review: t('status.in_review'),
    done: t('status.done'),
    cancelled: t('status.cancelled'),
  };

  const chartData = data.map((item) => ({
    name: statusLabels[item.status] || item.status,
    value: item.count,
    color: item.color,
  }));

  const totalIssues = data.reduce((sum, item) => sum + item.count, 0);

  if (totalIssues === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('dashboard.statusDistribution')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-slate-400">
            {t('common.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {t('dashboard.statusDistribution')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [value, t('issues.title')]}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => (
                <span className="text-xs text-slate-400">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
