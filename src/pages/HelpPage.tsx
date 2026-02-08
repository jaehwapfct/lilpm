import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Book, MessageCircle, Video, FileText, ExternalLink,
    HelpCircle, Mail, Bug, Lightbulb, Keyboard, ChevronRight,
    Globe, Github, Twitter, Youtube
} from 'lucide-react';

export function HelpPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const helpSections = [
        {
            title: t('help.gettingStarted'),
            icon: Book,
            items: [
                { label: t('help.quickStart'), href: '/docs/quick-start' },
                { label: t('help.projectSetup'), href: '/docs/project-setup' },
                { label: t('help.teamManagement'), href: '/docs/team-management' },
                { label: t('help.issueTracking'), href: '/docs/issue-tracking' },
            ]
        },
        {
            title: t('help.features'),
            icon: Lightbulb,
            items: [
                { label: t('help.lilyAI'), href: '/docs/lily-ai' },
                { label: t('help.prdEditor'), href: '/docs/prd-editor' },
                { label: t('help.collaboration'), href: '/docs/collaboration' },
                { label: t('help.integrations'), href: '/docs/integrations' },
            ]
        },
    ];

    const keyboardShortcuts = [
        { keys: ['G', 'I'], action: t('shortcuts.goToInbox') },
        { keys: ['G', 'D'], action: t('shortcuts.goToDashboard') },
        { keys: ['G', 'P'], action: t('shortcuts.goToProjects') },
        { keys: ['C'], action: t('shortcuts.createIssue') },
        { keys: ['⌘', 'K'], action: t('shortcuts.quickSearch') },
        { keys: ['⌘', '⇧', 'P'], action: t('shortcuts.commandPalette') },
        { keys: ['?'], action: t('shortcuts.showShortcuts') },
        { keys: ['Esc'], action: t('shortcuts.closeDialog') },
    ];

    return (
        <AppLayout>
            <ScrollArea className="h-full">
                <div className="max-w-4xl mx-auto p-6 space-y-8">
                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold">{t('help.title')}</h1>
                        <p className="text-muted-foreground mt-2">
                            {t('help.description')}
                        </p>
                    </div>

                    {/* Quick Support */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                            <CardContent className="flex items-center gap-4 pt-6">
                                <div className="p-3 rounded-lg bg-primary/10">
                                    <MessageCircle className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{t('help.liveChat')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('help.chatDescription')}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                            <CardContent className="flex items-center gap-4 pt-6">
                                <div className="p-3 rounded-lg bg-blue-500/10">
                                    <Mail className="h-6 w-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{t('help.emailSupport')}</h3>
                                    <p className="text-sm text-muted-foreground">support@lilpm.io</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                            <CardContent className="flex items-center gap-4 pt-6">
                                <div className="p-3 rounded-lg bg-orange-500/10">
                                    <Bug className="h-6 w-6 text-orange-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{t('help.reportBug')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('help.reportDescription')}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Documentation Sections */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {helpSections.map((section) => (
                            <Card key={section.title}>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <section.icon className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">{section.title}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {section.items.map((item) => (
                                        <button
                                            key={item.href}
                                            onClick={() => navigate(item.href)}
                                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent text-left"
                                        >
                                            <span className="text-sm">{item.label}</span>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    ))}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Keyboard Shortcuts */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Keyboard className="h-5 w-5 text-primary" />
                                <CardTitle>{t('help.keyboardShortcuts')}</CardTitle>
                            </div>
                            <CardDescription>{t('help.shortcutsDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 md:grid-cols-2">
                                {keyboardShortcuts.map((shortcut, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <span className="text-sm">{shortcut.action}</span>
                                        <div className="flex gap-1">
                                            {shortcut.keys.map((key, i) => (
                                                <React.Fragment key={i}>
                                                    <kbd className="px-2 py-1 text-xs font-semibold bg-background border rounded shadow-sm">
                                                        {key}
                                                    </kbd>
                                                    {i < shortcut.keys.length - 1 && <span className="text-muted-foreground">+</span>}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Video Tutorials */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Video className="h-5 w-5 text-primary" />
                                <CardTitle>{t('help.videoTutorials')}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-3">
                                {[
                                    { title: t('help.introVideo'), duration: '5:30' },
                                    { title: t('help.lilyAIVideo'), duration: '8:45' },
                                    { title: t('help.teamCollab'), duration: '6:20' },
                                ].map((video, idx) => (
                                    <div key={idx} className="relative group cursor-pointer rounded-lg overflow-hidden border">
                                        <div className="aspect-video bg-muted flex items-center justify-center">
                                            <Video className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="p-3">
                                            <p className="font-medium text-sm">{video.title}</p>
                                            <p className="text-xs text-muted-foreground">{video.duration}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Community & Resources */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('help.community')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-4">
                                <Button variant="outline" className="gap-2">
                                    <Github className="h-4 w-4" />
                                    GitHub
                                </Button>
                                <Button variant="outline" className="gap-2">
                                    <Twitter className="h-4 w-4" />
                                    Twitter
                                </Button>
                                <Button variant="outline" className="gap-2">
                                    <Youtube className="h-4 w-4" />
                                    YouTube
                                </Button>
                                <Button variant="outline" className="gap-2">
                                    <Globe className="h-4 w-4" />
                                    {t('help.blog')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>
        </AppLayout>
    );
}

export default HelpPage;
