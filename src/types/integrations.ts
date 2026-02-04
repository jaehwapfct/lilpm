// GitHub & Slack Integration Types

export interface GitHubIntegration {
  id: string;
  team_id: string;
  installation_id?: string;
  access_token?: string;
  repository_url?: string;
  repository_name?: string;
  repository_owner?: string;
  webhook_secret?: string;
  enabled: boolean;
  auto_link_commits: boolean;
  auto_link_prs: boolean;
  auto_close_on_merge: boolean;
  created_at: string;
  updated_at: string;
}

export interface GitHubCommit {
  id: string;
  issue_id: string;
  commit_sha: string;
  commit_message: string;
  commit_url: string;
  author_name: string;
  author_email: string;
  author_avatar?: string;
  created_at: string;
}

export interface GitHubPullRequest {
  id: string;
  issue_id: string;
  pr_number: number;
  pr_title: string;
  pr_url: string;
  pr_state: 'open' | 'closed' | 'merged';
  branch_name: string;
  author_name: string;
  author_avatar?: string;
  created_at: string;
  merged_at?: string;
  closed_at?: string;
}

export interface SlackIntegration {
  id: string;
  team_id: string;
  webhook_url?: string;
  channel_id?: string;
  channel_name?: string;
  bot_token?: string;
  enabled: boolean;
  notify_on_issue_created: boolean;
  notify_on_issue_completed: boolean;
  notify_on_comment: boolean;
  notify_on_mention: boolean;
  notify_on_cycle_start: boolean;
  notify_on_cycle_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlackNotification {
  id: string;
  team_id: string;
  type: SlackNotificationType;
  payload: Record<string, unknown>;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  error_message?: string;
  created_at: string;
}

export type SlackNotificationType = 
  | 'issue_created'
  | 'issue_completed'
  | 'issue_assigned'
  | 'comment_added'
  | 'mention'
  | 'cycle_started'
  | 'cycle_ended'
  | 'pr_linked'
  | 'pr_merged';

// Issue Relations (Linear-style)
export interface IssueRelation {
  id: string;
  issue_id: string;
  related_issue_id: string;
  relation_type: IssueRelationType;
  created_at: string;
  created_by: string;
}

export type IssueRelationType = 
  | 'blocks'      // This issue blocks the related issue
  | 'blocked_by'  // This issue is blocked by the related issue
  | 'relates_to'  // General relation
  | 'duplicates'  // This issue duplicates the related issue
  | 'parent_of'   // This issue is parent of the related issue
  | 'child_of';   // This issue is child of the related issue

// Triage/Inbox
export interface TriageItem {
  id: string;
  team_id: string;
  issue_id?: string;
  source: 'github' | 'slack' | 'email' | 'api' | 'internal';
  title: string;
  description?: string;
  metadata: Record<string, unknown>;
  status: 'new' | 'triaged' | 'snoozed' | 'declined';
  snoozed_until?: string;
  triaged_by?: string;
  triaged_at?: string;
  created_at: string;
}
