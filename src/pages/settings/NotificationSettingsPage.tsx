import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  Volume2,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AppLayout } from '@/components/layout';
import { useNotificationSettingsStore } from '@/stores/notificationSettingsStore';
import { toast } from 'sonner';

export function NotificationSettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const settings = useNotificationSettingsStore();

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    settings.updateSettings({ [key]: value });
    toast.success(t('settings.saved'));
  };

  return (
    <AppLayout>
      <div className="w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              {t('settings.notifications')}
            </h1>
            <p className="text-slate-400">
              {t('settings.notificationsDescription')}
            </p>
          </div>
        </div>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.generalNotifications')}</CardTitle>
            <CardDescription>
              {t('settings.generalNotificationsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-slate-400" />
                <div>
                  <Label>{t('settings.enableNotifications')}</Label>
                  <p className="text-sm text-slate-400">
                    {t('settings.enableNotificationsDesc')}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enableNotifications}
                onCheckedChange={(checked) => handleToggle('enableNotifications', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-slate-400" />
                <div>
                  <Label>{t('settings.enableSounds')}</Label>
                  <p className="text-sm text-slate-400">
                    {t('settings.enableSoundsDesc')}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enableSounds}
                onCheckedChange={(checked) => handleToggle('enableSounds', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-slate-400" />
                <div>
                  <Label>{t('settings.desktopNotifications')}</Label>
                  <p className="text-sm text-slate-400">
                    {t('settings.desktopNotificationsDesc')}
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.enableDesktopNotifications}
                onCheckedChange={(checked) => handleToggle('enableDesktopNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('settings.emailNotifications')}
            </CardTitle>
            <CardDescription>
              {t('settings.emailNotificationsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t('notifications.issue_assigned')}</Label>
              <Switch
                checked={settings.emailIssueAssigned}
                onCheckedChange={(checked) => handleToggle('emailIssueAssigned', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>{t('notifications.issue_mentioned')}</Label>
              <Switch
                checked={settings.emailIssueMentioned}
                onCheckedChange={(checked) => handleToggle('emailIssueMentioned', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>{t('notifications.comment_added')}</Label>
              <Switch
                checked={settings.emailCommentAdded}
                onCheckedChange={(checked) => handleToggle('emailCommentAdded', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>{t('notifications.status_changed')}</Label>
              <Switch
                checked={settings.emailStatusChanged}
                onCheckedChange={(checked) => handleToggle('emailStatusChanged', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>{t('notifications.due_date_reminder')}</Label>
              <Switch
                checked={settings.emailDueDateReminder}
                onCheckedChange={(checked) => handleToggle('emailDueDateReminder', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {t('settings.pushNotifications')}
            </CardTitle>
            <CardDescription>
              {t('settings.pushNotificationsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t('notifications.issue_assigned')}</Label>
              <Switch
                checked={settings.pushIssueAssigned}
                onCheckedChange={(checked) => handleToggle('pushIssueAssigned', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>{t('notifications.issue_mentioned')}</Label>
              <Switch
                checked={settings.pushIssueMentioned}
                onCheckedChange={(checked) => handleToggle('pushIssueMentioned', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>{t('notifications.comment_added')}</Label>
              <Switch
                checked={settings.pushCommentAdded}
                onCheckedChange={(checked) => handleToggle('pushCommentAdded', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>{t('notifications.status_changed')}</Label>
              <Switch
                checked={settings.pushStatusChanged}
                onCheckedChange={(checked) => handleToggle('pushStatusChanged', checked)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label>{t('notifications.due_date_reminder')}</Label>
              <Switch
                checked={settings.pushDueDateReminder}
                onCheckedChange={(checked) => handleToggle('pushDueDateReminder', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reset button */}
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => {
              settings.resetToDefaults();
              toast.success(t('settings.resetToDefaults'));
            }}
          >
            {t('settings.resetToDefaults')}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
