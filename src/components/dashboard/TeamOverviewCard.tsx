import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface TeamOverviewCardProps {
  teamName: string;
  user?: User | null;
  totalIssues: number;
  completedThisWeek: number;
  activeMembers: number;
}

export function TeamOverviewCard({
  teamName,
  user,
  totalIssues,
  completedThisWeek,
  activeMembers,
}: TeamOverviewCardProps) {
  const { t, i18n } = useTranslation();
  const currentHour = new Date().getHours();
  
  const getGreeting = () => {
    if (currentHour < 12) return t('dashboard.goodMorning');
    if (currentHour < 18) return t('dashboard.goodAfternoon');
    return t('dashboard.goodEvening');
  };

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{getGreeting()}</p>
            <h2 className="text-2xl font-bold">
              {user?.name || t('dashboard.welcome')}
            </h2>
            <p className="text-muted-foreground">
              {t('dashboard.welcomeTeam', { team: teamName })}
            </p>
          </div>
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.avatarUrl} alt={user?.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {user?.name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold">{totalIssues}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.totalTasks')}</p>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold text-green-500">{completedThisWeek}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.completedWeek')}</p>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-lg">
            <p className="text-2xl font-bold">{activeMembers}</p>
            <p className="text-xs text-muted-foreground">{t('dashboard.activeMembers')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
