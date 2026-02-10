import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, CheckCircle2, Plus, Edit, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityWithUser } from '@/types/database';

interface ProfileActivityHistoryProps {
  activities: ActivityWithUser[];
  isLoading?: boolean;
}

const actionIcons: Record<string, React.ElementType> = {
  issue_created: Plus,
  issue_updated: Edit,
  status_changed: Edit,
  priority_changed: Edit,
  assignee_changed: Edit,
  comment_added: MessageSquare,
  comment_updated: MessageSquare,
  comment_deleted: MessageSquare,
  label_added: Plus,
  label_removed: Edit,
};

export function ProfileActivityHistory({ activities, isLoading }: ProfileActivityHistoryProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            {t('profile.recentActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-[#121215]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#121215] rounded w-3/4" />
                  <div className="h-3 bg-[#121215] rounded w-1/2" />
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
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          {t('profile.recentActivity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('profile.noActivity')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.slice(0, 10).map((activity, index) => {
              const Icon = actionIcons[activity.type] || Edit;
              const data = activity.data as Record<string, string> | null;
              
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 relative"
                >
                  {/* Timeline connector */}
                  {index < Math.min(activities.length, 10) - 1 && (
                    <div className="absolute left-4 top-8 w-px h-full bg-border -translate-x-1/2" />
                  )}
                  
                  <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center relative z-10">
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm">
                      <span className="font-medium">{t(`activity.${activity.type}`)}</span>
                      {data?.field && (
                        <span className="text-slate-400">
                          {' '}{data.field}
                        </span>
                      )}
                      {data?.old_value && data?.new_value && (
                        <span className="text-slate-400">
                          {' '}from <Badge variant="outline" className="text-xs">{data.old_value}</Badge>
                          {' '}to <Badge variant="outline" className="text-xs">{data.new_value}</Badge>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
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
