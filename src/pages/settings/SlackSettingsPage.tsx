import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  MessageSquare,
  Bell,
  Check,
  X,
  Settings2,
  Send,
  Hash,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Webhook,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AppLayout } from '@/components/layout';
import { useIntegrationStore } from '@/stores/integrationStore';
import { useMCPStore } from '@/stores/mcpStore';
import { toast } from 'sonner';

export function SlackSettingsPage() {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testingWebhook, setTestingWebhook] = useState(false);
  
  const { slack, setSlackIntegration, updateSlackSettings } = useIntegrationStore();
  const { connectors, toggleConnector } = useMCPStore();

  // Find Slack MCP connector
  const slackMcp = connectors.find(c => c.name === 'Slack');

  const handleConnectWebhook = () => {
    if (!webhookUrl.trim()) {
      toast.error('Webhook URL을 입력해주세요');
      return;
    }

    if (!webhookUrl.includes('hooks.slack.com')) {
      toast.error('올바른 Slack Webhook URL을 입력해주세요');
      return;
    }

    setSlackIntegration({
      id: Math.random().toString(36).substring(2),
      team_id: 'current-team',
      webhook_url: webhookUrl,
      enabled: true,
      notify_on_issue_created: true,
      notify_on_issue_completed: true,
      notify_on_comment: false,
      notify_on_mention: true,
      notify_on_cycle_start: true,
      notify_on_cycle_end: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    toast.success('Slack Webhook이 연결되었습니다');
    setShowWebhookDialog(false);
    setWebhookUrl('');
  };

  const handleTestWebhook = async () => {
    if (!slack?.webhook_url) {
      toast.error('Webhook이 설정되지 않았습니다');
      return;
    }

    setTestingWebhook(true);
    
    // Simulate webhook test
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    toast.success('테스트 메시지가 전송되었습니다');
    setTestingWebhook(false);
  };

  const handleDisconnect = () => {
    setSlackIntegration(null);
    toast.success('Slack 연결이 해제되었습니다');
  };

  const handleMcpToggle = () => {
    if (slackMcp) {
      toggleConnector(slackMcp.id);
      toast.success(slackMcp.enabled ? 'Slack MCP가 비활성화되었습니다' : 'Slack MCP가 활성화되었습니다');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5 md:h-6 md:w-6" />
              Slack 연동
            </h1>
            <p className="text-sm text-muted-foreground">
              Slack으로 알림을 받고 AI와 연동합니다
            </p>
          </div>
          {(slack?.enabled || slackMcp?.enabled) && (
            <Badge variant="default" className="bg-green-500/20 text-green-400">
              <Check className="h-3 w-3 mr-1" />
              연결됨
            </Badge>
          )}
        </div>

        <Tabs defaultValue="webhook" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="webhook" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhook 알림
            </TabsTrigger>
            <TabsTrigger value="mcp" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              MCP 연동
            </TabsTrigger>
          </TabsList>

          {/* Webhook Tab */}
          <TabsContent value="webhook" className="space-y-6 mt-6">
            {!slack?.enabled ? (
              <Card>
                <CardHeader>
                  <CardTitle>Slack Incoming Webhook</CardTitle>
                  <CardDescription>
                    Slack Webhook을 설정하여 이슈 생성, 완료, 멘션 등의 알림을 받습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Webhook 생성 방법</AlertTitle>
                    <AlertDescription className="mt-2">
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Slack 앱 설정 페이지에서 Incoming Webhooks를 활성화하세요</li>
                        <li>알림을 받을 채널을 선택하세요</li>
                        <li>생성된 Webhook URL을 복사하세요</li>
                      </ol>
                      <a 
                        href="https://api.slack.com/apps" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-primary hover:underline"
                      >
                        Slack 앱 설정으로 이동 <ExternalLink className="h-3 w-3" />
                      </a>
                    </AlertDescription>
                  </Alert>
                  <Button onClick={() => setShowWebhookDialog(true)}>
                    <Webhook className="h-4 w-4 mr-2" />
                    Webhook 설정하기
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Connected Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Webhook 연결 상태</span>
                      <Button variant="outline" size="sm" onClick={handleTestWebhook} disabled={testingWebhook}>
                        {testingWebhook ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        테스트 전송
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                      <Hash className="h-8 w-8 text-[#4A154B]" />
                      <div className="flex-1">
                        <p className="font-medium">{slack.channel_name || 'Slack 채널'}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {slack.webhook_url?.substring(0, 50)}...
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500">
                        활성
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      알림 설정
                    </CardTitle>
                    <CardDescription>
                      어떤 이벤트에 대해 Slack 알림을 받을지 설정합니다
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">이슈 생성</Label>
                        <p className="text-sm text-muted-foreground">
                          새 이슈가 생성되면 알림을 받습니다
                        </p>
                      </div>
                      <Switch
                        checked={slack.notify_on_issue_created}
                        onCheckedChange={(checked) => updateSlackSettings({ notify_on_issue_created: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">이슈 완료</Label>
                        <p className="text-sm text-muted-foreground">
                          이슈가 완료되면 알림을 받습니다
                        </p>
                      </div>
                      <Switch
                        checked={slack.notify_on_issue_completed}
                        onCheckedChange={(checked) => updateSlackSettings({ notify_on_issue_completed: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">댓글</Label>
                        <p className="text-sm text-muted-foreground">
                          새 댓글이 작성되면 알림을 받습니다
                        </p>
                      </div>
                      <Switch
                        checked={slack.notify_on_comment}
                        onCheckedChange={(checked) => updateSlackSettings({ notify_on_comment: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">멘션</Label>
                        <p className="text-sm text-muted-foreground">
                          나를 멘션하면 알림을 받습니다
                        </p>
                      </div>
                      <Switch
                        checked={slack.notify_on_mention}
                        onCheckedChange={(checked) => updateSlackSettings({ notify_on_mention: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">스프린트 시작/종료</Label>
                        <p className="text-sm text-muted-foreground">
                          스프린트 시작/종료 시 알림을 받습니다
                        </p>
                      </div>
                      <Switch
                        checked={slack.notify_on_cycle_start}
                        onCheckedChange={(checked) => updateSlackSettings({ 
                          notify_on_cycle_start: checked,
                          notify_on_cycle_end: checked,
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Disconnect */}
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="text-destructive">연결 해제</CardTitle>
                    <CardDescription>
                      Slack Webhook 연동을 해제합니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="destructive" onClick={handleDisconnect}>
                      <X className="h-4 w-4 mr-2" />
                      Webhook 연결 해제
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* MCP Tab */}
          <TabsContent value="mcp" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Slack MCP 연동</CardTitle>
                <CardDescription>
                  Lily AI가 Slack과 연동하여 메시지를 읽고, 작성할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <p className="font-medium">Slack MCP Connector</p>
                      <p className="text-sm text-muted-foreground">
                        Lily AI가 Slack 채널에 접근할 수 있습니다
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={slackMcp?.enabled ?? false}
                    onCheckedChange={handleMcpToggle}
                  />
                </div>

                <Alert>
                  <Bot className="h-4 w-4" />
                  <AlertDescription>
                    MCP 연동을 활성화하면 Lily AI가 Slack에서 메시지를 읽고, 
                    작업 현황을 공유할 수 있습니다. MCP 설정에서 더 자세한 구성이 가능합니다.
                  </AlertDescription>
                </Alert>

                <Button 
                  variant="outline" 
                  onClick={() => navigate('/settings/mcp')}
                  className="w-full"
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  MCP 설정으로 이동
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Webhook Dialog */}
        <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Slack Webhook 설정</DialogTitle>
              <DialogDescription>
                Slack에서 생성한 Incoming Webhook URL을 입력하세요
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  placeholder="https://hooks.slack.com/services/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowWebhookDialog(false)}>
                취소
              </Button>
              <Button onClick={handleConnectWebhook}>
                연결
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
