import type { Label, Cycle, Issue } from '@/types';
import { apiClient } from './client';

// Label API
export const labelApi = {
    list: (teamId: string) =>
        apiClient.get<Label[]>(`/teams/${teamId}/labels`),

    create: (teamId: string, data: { name: string; color: string }) =>
        apiClient.post<Label>(`/teams/${teamId}/labels`, data),

    update: (labelId: string, data: Partial<Label>) =>
        apiClient.patch<Label>(`/labels/${labelId}`, data),

    delete: (labelId: string) =>
        apiClient.delete(`/labels/${labelId}`),
};

// Cycle API
export const cycleApi = {
    list: (teamId: string) =>
        apiClient.get<Cycle[]>(`/teams/${teamId}/cycles`),

    get: (cycleId: string) =>
        apiClient.get<Cycle>(`/cycles/${cycleId}`),

    create: (teamId: string, data: Partial<Cycle>) =>
        apiClient.post<Cycle>(`/teams/${teamId}/cycles`, data),

    update: (cycleId: string, data: Partial<Cycle>) =>
        apiClient.patch<Cycle>(`/cycles/${cycleId}`, data),

    delete: (cycleId: string) =>
        apiClient.delete(`/cycles/${cycleId}`),

    getIssues: (cycleId: string) =>
        apiClient.get<Issue[]>(`/cycles/${cycleId}/issues`),

    addIssue: (cycleId: string, issueId: string) =>
        apiClient.post(`/cycles/${cycleId}/issues`, { issueId }),

    removeIssue: (cycleId: string, issueId: string) =>
        apiClient.delete(`/cycles/${cycleId}/issues/${issueId}`),
};
