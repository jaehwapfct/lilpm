import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  CheckCircle2, 
  Circle, 
  MessageSquare, 
  Plus,
  ArrowRight,
  Tag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useLanguageStore } from '@/stores/languageStore';

interface ActivityItem {
  id: string;
  type: 'issue_created' | 'status_changed' | 'comment_added' | 'assignee_changed' | 'label_added';
  user: {
    name: string;
    avatarUrl?: string;
  };
  issueTitle?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

interface ProjectActivityTimelineProps {
  activities: ActivityItem[];
  className?: string;
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  issue_created: Plus,
  status_changed: ArrowRight,
  comment_added: MessageSquare,
  assignee_changed: Circle,
  label_added: Tag,
};

const ACTIVITY_COLORS: Record<string, string> = {
  issue_created: 'bg-green-500',
  status_changed: 'bg-blue-500',
  comment_added: 'bg-purple-500',
  assignee_changed: 'bg-orange-500',
  label_added: 'bg-pink-500',
};

export function ProjectActivityTimeline({ activities, className }: ProjectActivityTimelineProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'ko' ? ko : enUS;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {t('dashboard.recentActivity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('dashboard.noActivity')}</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
            
            <div className="space-y-4">
              {activities.slice(0, 10).map((activity) => {
                const Icon = ACTIVITY_ICONS[activity.type] || Circle;
                const colorClass = ACTIVITY_COLORS[activity.type] || 'bg-muted';
                
                return (
                  <div key={activity.id} className="relative flex gap-3 pl-2">
                    {/* Icon */}
                    <div className={`relative z-10 w-5 h-5 rounded-full ${colorClass} flex items-center justify-center`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={activity.user.avatarUrl} />
                          <AvatarFallback className="text-[10px]">
                            {activity.user.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">
                          {activity.user.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.createdAt), { 
                            addSuffix: true, 
                            locale: dateLocale 
                          })}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {t(`activity.${activity.type}`)}
                        {activity.issueTitle && (
                          <span className="font-medium text-foreground ml-1">
                            "{activity.issueTitle}"
                          </span>
                        )}
                        {activity.oldValue && activity.newValue && (
                          <span className="ml-1">
                            {activity.oldValue} → {activity.newValue}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
