import type { Project } from '@/types';
import { apiClient } from './client';

// Project API
export const projectApi = {
    list: (teamId: string) =>
        apiClient.get<Project[]>(`/teams/${teamId}/projects`),

    get: (projectId: string) =>
        apiClient.get<Project>(`/projects/${projectId}`),

    create: (teamId: string, data: Partial<Project>) =>
        apiClient.post<Project>(`/teams/${teamId}/projects`, data),

    update: (projectId: string, data: Partial<Project>) =>
        apiClient.patch<Project>(`/projects/${projectId}`, data),

    delete: (projectId: string) =>
        apiClient.delete(`/projects/${projectId}`),
};
