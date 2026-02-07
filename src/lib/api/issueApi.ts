import type { Issue, PaginatedResponse, ViewFilters, Comment, Activity } from '@/types';
import { apiClient } from './client';

// Issue API
export const issueApi = {
    list: (teamId: string, filters?: ViewFilters) => {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined) {
                    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
                }
            });
        }
        const query = params.toString();
        return apiClient.get<PaginatedResponse<Issue>>(
            `/teams/${teamId}/issues${query ? `?${query}` : ''}`
        );
    },

    get: (issueId: string) =>
        apiClient.get<Issue>(`/issues/${issueId}`),

    create: (teamId: string, data: Partial<Issue>) =>
        apiClient.post<Issue>(`/teams/${teamId}/issues`, data),

    update: (issueId: string, data: Partial<Issue>) =>
        apiClient.patch<Issue>(`/issues/${issueId}`, data),

    delete: (issueId: string) =>
        apiClient.delete(`/issues/${issueId}`),

    // Batch operations
    batchUpdate: (issueIds: string[], data: Partial<Issue>) =>
        apiClient.post<Issue[]>('/issues/batch', { issueIds, ...data }),

    // Sub-issues
    getSubIssues: (issueId: string) =>
        apiClient.get<Issue[]>(`/issues/${issueId}/sub-issues`),

    createSubIssue: (parentId: string, data: Partial<Issue>) =>
        apiClient.post<Issue>(`/issues/${parentId}/sub-issues`, data),
};

// Comment API
export const commentApi = {
    list: (issueId: string) =>
        apiClient.get<Comment[]>(`/issues/${issueId}/comments`),

    create: (issueId: string, body: string) =>
        apiClient.post<Comment>(`/issues/${issueId}/comments`, { body }),

    update: (commentId: string, body: string) =>
        apiClient.patch<Comment>(`/comments/${commentId}`, { body }),

    delete: (commentId: string) =>
        apiClient.delete(`/comments/${commentId}`),
};

// Activity API
export const activityApi = {
    listForIssue: (issueId: string) =>
        apiClient.get<Activity[]>(`/issues/${issueId}/activity`),

    listForTeam: (teamId: string, limit = 50) =>
        apiClient.get<Activity[]>(`/teams/${teamId}/activity?limit=${limit}`),
};
