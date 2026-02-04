import React from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import {
  CheckCircle2,
  Circle,
  MessageSquare,
  Plus,
  User,
  Tag,
  AlertCircle,
} from 'lucide-react';
import type { ActivityWithUser, ActivityType } from '@/types/database';

interface ActivityFeedProps {
  activities: ActivityWithUser[];
  isLoading?: boolean;
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ko' ? ko : enUS;

  const getActivityConfig = (type: ActivityType) => {
    const configs: Record<ActivityType, { icon: React.ReactNode; labelKey: string; color: string }> = {
      issue_created: { icon: <Plus className="h-3 w-3" />, labelKey: 'activity.issue_created', color: 'bg-green-500' },
      issue_updated: { icon: <Circle className="h-3 w-3" />, labelKey: 'activity.issue_updated', color: 'bg-blue-500' },
      status_changed: { icon: <CheckCircle2 className="h-3 w-3" />, labelKey: 'activity.status_changed', color: 'bg-purple-500' },
      priority_changed: { icon: <AlertCircle className="h-3 w-3" />, labelKey: 'activity.priority_changed', color: 'bg-orange-500' },
      assignee_changed: { icon: <User className="h-3 w-3" />, labelKey: 'activity.assignee_changed', color: 'bg-cyan-500' },
      comment_added: { icon: <MessageSquare className="h-3 w-3" />, labelKey: 'activity.comment_added', color: 'bg-yellow-500' },
      comment_updated: { icon: <MessageSquare className="h-3 w-3" />, labelKey: 'activity.comment_updated', color: 'bg-yellow-600' },
      comment_deleted: { icon: <MessageSquare className="h-3 w-3" />, labelKey: 'activity.comment_deleted', color: 'bg-red-500' },
      label_added: { icon: <Tag className="h-3 w-3" />, labelKey: 'activity.label_added', color: 'bg-pink-500' },
      label_removed: { icon: <Tag className="h-3 w-3" />, labelKey: 'activity.label_removed', color: 'bg-gray-500' },
    };
    return configs[type] || { icon: <Circle className="h-3 w-3" />, labelKey: type, color: 'bg-muted' };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
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
        <CardTitle className="text-base">{t('dashboard.recentActivity')}</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('dashboard.noActivity')}
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const config = getActivityConfig(activity.type);

              return (
                <div key={activity.id} className="flex gap-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {activity.user?.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ${config.color} flex items-center justify-center text-white`}>
                      {config.icon}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{activity.user?.name || t('common.user')}</span>
                      <span className="text-muted-foreground ml-1">{t(config.labelKey)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale })}
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
