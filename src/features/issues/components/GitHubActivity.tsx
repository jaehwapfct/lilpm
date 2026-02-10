import React from 'react';
import { GitCommit, GitPullRequest, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useIntegrationStore } from '@/stores/integrationStore';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface GitHubActivityProps {
  issueId: string;
}

export function GitHubActivity({ issueId }: GitHubActivityProps) {
  const { getCommitsForIssue, getPRsForIssue } = useIntegrationStore();

  const commits = getCommitsForIssue(issueId);
  const pullRequests = getPRsForIssue(issueId);

  const hasActivity = commits.length > 0 || pullRequests.length > 0;

  if (!hasActivity) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <GitCommit className="h-4 w-4" />
          GitHub 연동
        </h4>
        <p className="text-sm text-slate-400">
          연결된 커밋이나 PR이 없습니다.
          <br />
          커밋 메시지에 이슈 ID를 포함하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <GitCommit className="h-4 w-4" />
        GitHub 활동
      </h4>

      {/* Pull Requests */}
      {pullRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase">Pull Requests</p>
          {pullRequests.map((pr) => (
            <a
              key={pr.id}
              href={pr.pr_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-white/5 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <GitPullRequest className={`h-4 w-4 ${
                pr.pr_state === 'merged' ? 'text-purple-500' : 
                pr.pr_state === 'open' ? 'text-green-500' : 'text-red-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{pr.pr_title}</p>
                <p className="text-xs text-slate-400">
                  #{pr.pr_number} • {pr.branch_name}
                </p>
              </div>
              <Badge variant={pr.pr_state === 'merged' ? 'default' : 'outline'} className="text-xs">
                {pr.pr_state}
              </Badge>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      )}

      {/* Commits */}
      {commits.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase">Commits</p>
          {commits.slice(0, 5).map((commit) => (
            <a
              key={commit.id}
              href={commit.commit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 bg-white/5 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <GitCommit className="h-4 w-4 text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{commit.commit_message}</p>
                <p className="text-xs text-slate-400">
                  {commit.author_name} • {formatDistanceToNow(new Date(commit.created_at), { 
                    addSuffix: true, 
                    locale: ko 
                  })}
                </p>
              </div>
              <code className="text-xs bg-[#121215] px-1.5 py-0.5 rounded font-mono">
                {commit.commit_sha.substring(0, 7)}
              </code>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
          {commits.length > 5 && (
            <p className="text-xs text-slate-400 text-center">
              +{commits.length - 5}개 더 보기
            </p>
          )}
        </div>
      )}
    </div>
  );
}
