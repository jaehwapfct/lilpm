import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Github,
  Link2,
  GitCommit,
  GitPullRequest,
  GitBranch,
  Check,
  X,
  Settings2,
  ExternalLink,
  RefreshCw,
  Loader2,
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
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AppLayout } from '@/components/layout';
import { useIntegrationStore } from '@/stores/integrationStore';
import { toast } from 'sonner';

export function GitHubSettingsPage() {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showRepoDialog, setShowRepoDialog] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');

  const {
    github,
    setGitHubIntegration,
    updateGitHubSettings,
    commits,
    pullRequests,
  } = useIntegrationStore();

  const handleConnect = async () => {
    setIsConnecting(true);

    // Simulate OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setGitHubIntegration({
      id: Math.random().toString(36).substring(2),
      team_id: 'current-team',
      enabled: true,
      auto_link_commits: true,
      auto_link_prs: true,
      auto_close_on_merge: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setIsConnecting(false);
    setShowRepoDialog(true);
  };

  const handleAddRepository = () => {
    if (!repoUrl.trim()) {
      toast.error('저장소 URL을 입력해주세요');
      return;
    }

    // Parse GitHub URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      toast.error('올바른 GitHub 저장소 URL을 입력해주세요');
      return;
    }

    const [, owner, repo] = match;

    updateGitHubSettings({
      repository_url: repoUrl,
      repository_owner: owner,
      repository_name: repo.replace('.git', ''),
    });

    toast.success('저장소가 연결되었습니다');
    setShowRepoDialog(false);
    setRepoUrl('');
  };

  const handleDisconnect = () => {
    setGitHubIntegration(null);
    toast.success('GitHub 연결이 해제되었습니다');
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
              <Github className="h-5 w-5 md:h-6 md:w-6" />
              GitHub 연동
            </h1>
            <p className="text-sm text-slate-400">
              커밋과 PR을 이슈와 연결하여 개발 진행 상황을 추적합니다
            </p>
          </div>
          {github?.enabled && (
            <Badge variant="default" className="bg-green-500/20 text-green-400">
              <Check className="h-3 w-3 mr-1" />
              연결됨
            </Badge>
          )}
        </div>

        {/* Connection Status */}
        {!github?.enabled ? (
          <Card>
            <CardHeader>
              <CardTitle>GitHub 계정 연결</CardTitle>
              <CardDescription>
                GitHub 계정을 연결하여 커밋, PR을 이슈와 자동으로 연결합니다.
                이슈 ID를 커밋 메시지나 PR에 포함하면 자동으로 연결됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Link2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>연동 방법:</strong> 커밋 메시지에 <code className="bg-[#121215] px-1 rounded">LPM-123</code> 형식으로
                  이슈 ID를 포함하면 자동으로 해당 이슈와 연결됩니다.
                </AlertDescription>
              </Alert>
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    연결 중...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4 mr-2" />
                    GitHub 계정 연결
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Connected Repository */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>연결된 저장소</span>
                  <Button variant="outline" size="sm" onClick={() => setShowRepoDialog(true)}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    변경
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {github.repository_name ? (
                  <div className="flex items-center gap-3 p-4 bg-[#121215] rounded-lg">
                    <Github className="h-8 w-8" />
                    <div className="flex-1">
                      <p className="font-medium">{github.repository_owner}/{github.repository_name}</p>
                      <p className="text-sm text-slate-400">{github.repository_url}</p>
                    </div>
                    <a
                      href={github.repository_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setShowRepoDialog(true)} className="w-full">
                    <Link2 className="h-4 w-4 mr-2" />
                    저장소 연결하기
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Automation Settings */}
            <Card>
              <CardHeader>
                <CardTitle>자동화 설정</CardTitle>
                <CardDescription>
                  GitHub 이벤트와 이슈를 자동으로 연결하고 상태를 업데이트합니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <GitCommit className="h-4 w-4" />
                      커밋 자동 연결
                    </Label>
                    <p className="text-sm text-slate-400">
                      커밋 메시지에 이슈 ID가 있으면 자동으로 연결합니다
                    </p>
                  </div>
                  <Switch
                    checked={github.auto_link_commits}
                    onCheckedChange={(checked) => updateGitHubSettings({ auto_link_commits: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <GitPullRequest className="h-4 w-4" />
                      PR 자동 연결
                    </Label>
                    <p className="text-sm text-slate-400">
                      PR 제목이나 브랜치명에 이슈 ID가 있으면 자동으로 연결합니다
                    </p>
                  </div>
                  <Switch
                    checked={github.auto_link_prs}
                    onCheckedChange={(checked) => updateGitHubSettings({ auto_link_prs: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      PR 병합 시 자동 완료
                    </Label>
                    <p className="text-sm text-slate-400">
                      연결된 PR이 병합되면 이슈를 자동으로 완료 상태로 변경합니다
                    </p>
                  </div>
                  <Switch
                    checked={github.auto_close_on_merge}
                    onCheckedChange={(checked) => updateGitHubSettings({ auto_close_on_merge: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>최근 활동</CardTitle>
                <CardDescription>
                  연결된 커밋 및 PR 목록
                </CardDescription>
              </CardHeader>
              <CardContent>
                {commits.length === 0 && pullRequests.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <GitCommit className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>아직 연결된 활동이 없습니다</p>
                    <p className="text-sm mt-1">
                      커밋 메시지에 <code className="bg-[#121215] px-1 rounded">LPM-123</code>를 포함하세요
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Sample data display */}
                    {commits.slice(0, 5).map((commit) => (
                      <div key={commit.id} className="flex items-center gap-3 p-3 bg-[#121215] rounded-xl">
                        <GitCommit className="h-4 w-4 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{commit.commit_message}</p>
                          <p className="text-xs text-slate-400">{commit.author_name}</p>
                        </div>
                        <code className="text-xs bg-[#121215] px-2 py-1 rounded">
                          {commit.commit_sha.substring(0, 7)}
                        </code>
                      </div>
                    ))}
                    {pullRequests.slice(0, 5).map((pr) => (
                      <div key={pr.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <GitPullRequest className={`h-4 w-4 ${pr.pr_state === 'merged' ? 'text-purple-500' :
                            pr.pr_state === 'open' ? 'text-green-500' : 'text-red-500'
                          }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{pr.pr_title}</p>
                          <p className="text-xs text-slate-400">#{pr.pr_number} by {pr.author_name}</p>
                        </div>
                        <Badge variant={pr.pr_state === 'merged' ? 'default' : 'outline'}>
                          {pr.pr_state}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Disconnect */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">연결 해제</CardTitle>
                <CardDescription>
                  GitHub 연동을 해제합니다. 기존 연결 기록은 유지됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={handleDisconnect}>
                  <X className="h-4 w-4 mr-2" />
                  GitHub 연결 해제
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Add Repository Dialog */}
        <Dialog open={showRepoDialog} onOpenChange={setShowRepoDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>GitHub 저장소 연결</DialogTitle>
              <DialogDescription>
                연동할 GitHub 저장소의 URL을 입력하세요
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>저장소 URL</Label>
                <Input
                  placeholder="https://github.com/username/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRepoDialog(false)}>
                취소
              </Button>
              <Button onClick={handleAddRepository}>
                연결
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
