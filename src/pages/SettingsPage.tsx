import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    User, Bell, Lock, Globe, Palette, Users, Zap, KeyRound,
    Mail, Shield, Moon, Sun, Monitor, Check, Upload
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useTeamStore } from '@/stores/teamStore';
import { toast } from 'sonner';

export function SettingsPage() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { user, updateUser } = useAuthStore();
    const { currentTeam } = useTeamStore();

    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        avatarUrl: user?.avatarUrl || '',
    });

    const [preferences, setPreferences] = useState({
        theme: 'system',
        language: i18n.language,
        compactMode: false,
        showAvatars: true,
        animationsEnabled: true,
    });

    const [notifications, setNotifications] = useState({
        emailAssignment: true,
        emailComments: true,
        emailMentions: true,
        emailStatusChange: false,
        inAppAssignment: true,
        inAppComments: true,
        inAppMentions: true,
        inAppStatusChange: true,
        desktopEnabled: false,
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            updateUser(profileForm);
            toast.success(t('settings.profileSaved'));
        } catch (error) {
            toast.error(t('settings.saveFailed'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        setPreferences(prev => ({ ...prev, language: lang }));
        localStorage.setItem('i18nextLng', lang);
    };

    const handleThemeChange = (theme: string) => {
        setPreferences(prev => ({ ...prev, theme }));
        document.documentElement.classList.remove('light', 'dark');
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
            document.documentElement.classList.add('light');
        }
        localStorage.setItem('theme', theme);
    };

    return (
        <AppLayout>
            <ScrollArea className="h-full">
                <div className="max-w-4xl mx-auto p-6 space-y-8">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
                        <p className="text-slate-400 mt-2">
                            {t('settings.description')}
                        </p>
                    </div>

                    <Tabs defaultValue="profile" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="profile" className="gap-2">
                                <User className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('settings.profile')}</span>
                            </TabsTrigger>
                            <TabsTrigger value="preferences" className="gap-2">
                                <Palette className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('settings.preferences')}</span>
                            </TabsTrigger>
                            <TabsTrigger value="notifications" className="gap-2">
                                <Bell className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('settings.notifications')}</span>
                            </TabsTrigger>
                            <TabsTrigger value="security" className="gap-2">
                                <Lock className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('settings.security')}</span>
                            </TabsTrigger>
                            <TabsTrigger value="integrations" className="gap-2">
                                <Zap className="h-4 w-4" />
                                <span className="hidden sm:inline">{t('settings.integrations')}</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Profile Tab */}
                        <TabsContent value="profile" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('settings.profileInfo')}</CardTitle>
                                    <CardDescription>{t('settings.profileDescription')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Avatar */}
                                    <div className="flex items-center gap-6">
                                        <Avatar className="h-20 w-20">
                                            <AvatarImage src={profileForm.avatarUrl} />
                                            <AvatarFallback className="text-2xl">
                                                {profileForm.name?.charAt(0).toUpperCase() || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <Upload className="h-4 w-4" />
                                                {t('settings.uploadPhoto')}
                                            </Button>
                                            <p className="text-xs text-slate-400 mt-2">
                                                {t('settings.avatarHint')}
                                            </p>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Name */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">{t('settings.fullName')}</Label>
                                        <Input
                                            id="name"
                                            value={profileForm.name}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder={t('settings.namePlaceholder')}
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">{t('settings.email')}</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={profileForm.email}
                                            onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                                            disabled
                                        />
                                        <p className="text-xs text-slate-400">
                                            {t('settings.emailHint')}
                                        </p>
                                    </div>

                                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                                        {isSaving ? t('settings.saving') : t('settings.saveChanges')}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Preferences Tab */}
                        <TabsContent value="preferences" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('settings.appearance')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Theme */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>{t('settings.theme')}</Label>
                                            <p className="text-sm text-slate-400">{t('settings.themeDescription')}</p>
                                        </div>
                                        <Select value={preferences.theme} onValueChange={handleThemeChange}>
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="light">
                                                    <div className="flex items-center gap-2">
                                                        <Sun className="h-4 w-4" />
                                                        {t('settings.light')}
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="dark">
                                                    <div className="flex items-center gap-2">
                                                        <Moon className="h-4 w-4" />
                                                        {t('settings.dark')}
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="system">
                                                    <div className="flex items-center gap-2">
                                                        <Monitor className="h-4 w-4" />
                                                        {t('settings.system')}
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Separator />

                                    {/* Language */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>{t('settings.language')}</Label>
                                            <p className="text-sm text-slate-400">{t('settings.languageDescription')}</p>
                                        </div>
                                        <Select value={preferences.language} onValueChange={handleLanguageChange}>
                                            <SelectTrigger className="w-40">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="en">English</SelectItem>
                                                <SelectItem value="ko">한국어</SelectItem>
                                                <SelectItem value="ja">日本語</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Separator />

                                    {/* Compact Mode */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>{t('settings.compactMode')}</Label>
                                            <p className="text-sm text-slate-400">{t('settings.compactModeDescription')}</p>
                                        </div>
                                        <Switch
                                            checked={preferences.compactMode}
                                            onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, compactMode: checked }))}
                                        />
                                    </div>

                                    {/* Animations */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>{t('settings.animations')}</Label>
                                            <p className="text-sm text-slate-400">{t('settings.animationsDescription')}</p>
                                        </div>
                                        <Switch
                                            checked={preferences.animationsEnabled}
                                            onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, animationsEnabled: checked }))}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Notifications Tab */}
                        <TabsContent value="notifications" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('settings.emailNotifications')}</CardTitle>
                                    <CardDescription>{t('settings.emailNotificationsDescription')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {[
                                        { key: 'emailAssignment', label: t('settings.notifyAssignment'), icon: Users },
                                        { key: 'emailComments', label: t('settings.notifyComments'), icon: Mail },
                                        { key: 'emailMentions', label: t('settings.notifyMentions'), icon: Bell },
                                        { key: 'emailStatusChange', label: t('settings.notifyStatusChange'), icon: Check },
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <item.icon className="h-4 w-4 text-slate-400" />
                                                <Label>{item.label}</Label>
                                            </div>
                                            <Switch
                                                checked={notifications[item.key as keyof typeof notifications] as boolean}
                                                onCheckedChange={(checked) =>
                                                    setNotifications(prev => ({ ...prev, [item.key]: checked }))
                                                }
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('settings.inAppNotifications')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {[
                                        { key: 'inAppAssignment', label: t('settings.notifyAssignment') },
                                        { key: 'inAppComments', label: t('settings.notifyComments') },
                                        { key: 'inAppMentions', label: t('settings.notifyMentions') },
                                        { key: 'inAppStatusChange', label: t('settings.notifyStatusChange') },
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between py-2">
                                            <Label>{item.label}</Label>
                                            <Switch
                                                checked={notifications[item.key as keyof typeof notifications] as boolean}
                                                onCheckedChange={(checked) =>
                                                    setNotifications(prev => ({ ...prev, [item.key]: checked }))
                                                }
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Security Tab */}
                        <TabsContent value="security" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('settings.password')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label>{t('settings.currentPassword')}</Label>
                                        <Input type="password" placeholder="••••••••" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('settings.newPassword')}</Label>
                                        <Input type="password" placeholder="••••••••" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{t('settings.confirmPassword')}</Label>
                                        <Input type="password" placeholder="••••••••" />
                                    </div>
                                    <Button>{t('settings.updatePassword')}</Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="h-5 w-5" />
                                        {t('settings.twoFactor')}
                                    </CardTitle>
                                    <CardDescription>{t('settings.twoFactorDescription')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button variant="outline">{t('settings.enable2FA')}</Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('settings.sessions')}</CardTitle>
                                    <CardDescription>{t('settings.sessionsDescription')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <p className="font-medium">{t('settings.currentSession')}</p>
                                                <p className="text-sm text-slate-400">Chrome • macOS • Seoul, Korea</p>
                                            </div>
                                            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded">
                                                {t('settings.active')}
                                            </span>
                                        </div>
                                        <Button variant="destructive" size="sm">
                                            {t('settings.signOutAll')}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Integrations Tab */}
                        <TabsContent value="integrations" className="space-y-6">
                            <div className="grid gap-4">
                                {[
                                    { name: 'GitHub', icon: '🐙', connected: true, description: t('settings.githubDescription') },
                                    { name: 'Slack', icon: '💬', connected: false, description: t('settings.slackDescription') },
                                    { name: 'Figma', icon: '🎨', connected: false, description: t('settings.figmaDescription') },
                                    { name: 'Linear', icon: '📐', connected: false, description: t('settings.linearDescription') },
                                ].map((integration) => (
                                    <Card key={integration.name}>
                                        <CardContent className="flex items-center justify-between pt-6">
                                            <div className="flex items-center gap-4">
                                                <span className="text-2xl">{integration.icon}</span>
                                                <div>
                                                    <h3 className="font-medium">{integration.name}</h3>
                                                    <p className="text-sm text-slate-400">{integration.description}</p>
                                                </div>
                                            </div>
                                            <Button variant={integration.connected ? 'outline' : 'default'}>
                                                {integration.connected ? t('settings.disconnect') : t('settings.connect')}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </ScrollArea>
        </AppLayout>
    );
}

export default SettingsPage;
