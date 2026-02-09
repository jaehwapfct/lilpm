import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText, Database, MessageSquare, Plus } from 'lucide-react';

export function QuickActionsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actions = [
    {
      icon: Sparkles,
      label: t('dashboard.askAI'),
      description: t('dashboard.askAIDesc'),
      onClick: () => navigate('/lily'),
      gradient: 'from-violet-500/20 to-purple-500/20',
      iconColor: 'text-violet-500',
    },
    {
      icon: Plus,
      label: t('dashboard.newIssue'),
      description: t('dashboard.newIssueDesc'),
      onClick: () => navigate('/issues?new=true'),
      gradient: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-blue-500',
    },
    {
      icon: Database,
      label: t('dashboard.viewDatabase'),
      description: t('dashboard.viewDatabaseDesc'),
      onClick: () => navigate('/database'),
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-500',
    },
    {
      icon: MessageSquare,
      label: t('dashboard.teamChat'),
      description: t('dashboard.teamChatDesc'),
      onClick: () => navigate('/team/members'),
      gradient: 'from-orange-500/20 to-amber-500/20',
      iconColor: 'text-orange-500',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('dashboard.quickActions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`p-4 rounded-xl bg-gradient-to-br ${action.gradient} border border-white/10 hover:border-white/20 transition-all text-left`}
              >
                <Icon className={`h-5 w-5 ${action.iconColor} mb-2`} />
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
