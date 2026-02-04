import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  GitHubIntegration, 
  GitHubCommit, 
  GitHubPullRequest,
  SlackIntegration,
  IssueRelation,
  IssueRelationType,
} from '@/types/integrations';

const generateId = () => Math.random().toString(36).substring(2, 15);

interface IntegrationState {
  // GitHub
  github: GitHubIntegration | null;
  commits: GitHubCommit[];
  pullRequests: GitHubPullRequest[];
  setGitHubIntegration: (integration: GitHubIntegration | null) => void;
  updateGitHubSettings: (settings: Partial<GitHubIntegration>) => void;
  addCommit: (commit: Omit<GitHubCommit, 'id' | 'created_at'>) => void;
  addPullRequest: (pr: Omit<GitHubPullRequest, 'id' | 'created_at'>) => void;
  updatePullRequest: (id: string, updates: Partial<GitHubPullRequest>) => void;
  getCommitsForIssue: (issueId: string) => GitHubCommit[];
  getPRsForIssue: (issueId: string) => GitHubPullRequest[];

  // Slack
  slack: SlackIntegration | null;
  setSlackIntegration: (integration: SlackIntegration | null) => void;
  updateSlackSettings: (settings: Partial<SlackIntegration>) => void;

  // Issue Relations
  relations: IssueRelation[];
  addRelation: (issueId: string, relatedIssueId: string, type: IssueRelationType, userId: string) => void;
  removeRelation: (id: string) => void;
  getRelationsForIssue: (issueId: string) => IssueRelation[];
  getBlockingIssues: (issueId: string) => string[];
  getBlockedByIssues: (issueId: string) => string[];
}

export const useIntegrationStore = create<IntegrationState>()(
  persist(
    (set, get) => ({
      // GitHub state
      github: null,
      commits: [],
      pullRequests: [],

      setGitHubIntegration: (integration) => set({ github: integration }),
      
      updateGitHubSettings: (settings) =>
        set((state) => ({
          github: state.github ? { ...state.github, ...settings } : null,
        })),

      addCommit: (commit) =>
        set((state) => ({
          commits: [
            ...state.commits,
            { ...commit, id: generateId(), created_at: new Date().toISOString() },
          ],
        })),

      addPullRequest: (pr) =>
        set((state) => ({
          pullRequests: [
            ...state.pullRequests,
            { ...pr, id: generateId(), created_at: new Date().toISOString() },
          ],
        })),

      updatePullRequest: (id, updates) =>
        set((state) => ({
          pullRequests: state.pullRequests.map((pr) =>
            pr.id === id ? { ...pr, ...updates } : pr
          ),
        })),

      getCommitsForIssue: (issueId) => {
        return get().commits.filter((c) => c.issue_id === issueId);
      },

      getPRsForIssue: (issueId) => {
        return get().pullRequests.filter((pr) => pr.issue_id === issueId);
      },

      // Slack state
      slack: null,

      setSlackIntegration: (integration) => set({ slack: integration }),
      
      updateSlackSettings: (settings) =>
        set((state) => ({
          slack: state.slack ? { ...state.slack, ...settings } : null,
        })),

      // Issue Relations
      relations: [],

      addRelation: (issueId, relatedIssueId, type, userId) => {
        const { relations } = get();
        
        // Check if relation already exists
        const exists = relations.some(
          (r) =>
            (r.issue_id === issueId && r.related_issue_id === relatedIssueId && r.relation_type === type) ||
            (r.issue_id === relatedIssueId && r.related_issue_id === issueId && r.relation_type === getInverseRelationType(type))
        );
        
        if (!exists) {
          set({
            relations: [
              ...relations,
              {
                id: generateId(),
                issue_id: issueId,
                related_issue_id: relatedIssueId,
                relation_type: type,
                created_at: new Date().toISOString(),
                created_by: userId,
              },
            ],
          });
        }
      },

      removeRelation: (id) =>
        set((state) => ({
          relations: state.relations.filter((r) => r.id !== id),
        })),

      getRelationsForIssue: (issueId) => {
        return get().relations.filter(
          (r) => r.issue_id === issueId || r.related_issue_id === issueId
        );
      },

      getBlockingIssues: (issueId) => {
        return get()
          .relations.filter(
            (r) =>
              (r.issue_id === issueId && r.relation_type === 'blocks') ||
              (r.related_issue_id === issueId && r.relation_type === 'blocked_by')
          )
          .map((r) => (r.issue_id === issueId ? r.related_issue_id : r.issue_id));
      },

      getBlockedByIssues: (issueId) => {
        return get()
          .relations.filter(
            (r) =>
              (r.issue_id === issueId && r.relation_type === 'blocked_by') ||
              (r.related_issue_id === issueId && r.relation_type === 'blocks')
          )
          .map((r) => (r.issue_id === issueId ? r.related_issue_id : r.issue_id));
      },
    }),
    {
      name: 'integration-store',
      partialize: (state) => ({
        github: state.github,
        commits: state.commits,
        pullRequests: state.pullRequests,
        slack: state.slack,
        relations: state.relations,
      }),
    }
  )
);

// Helper function to get inverse relation type
function getInverseRelationType(type: IssueRelationType): IssueRelationType {
  switch (type) {
    case 'blocks':
      return 'blocked_by';
    case 'blocked_by':
      return 'blocks';
    case 'parent_of':
      return 'child_of';
    case 'child_of':
      return 'parent_of';
    case 'duplicates':
      return 'duplicates';
    case 'relates_to':
      return 'relates_to';
    default:
      return type;
  }
}
