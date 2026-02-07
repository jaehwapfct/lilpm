import type { Team, TeamMember, TeamInvite } from '@/types';
import { apiClient } from './client';

// Team API
export const teamApi = {
    list: () => apiClient.get<Team[]>('/teams'),

    get: (teamId: string) => apiClient.get<Team>(`/teams/${teamId}`),

    create: (data: { name: string; slug: string }) =>
        apiClient.post<Team>('/teams', data),

    update: (teamId: string, data: Partial<Team>) =>
        apiClient.patch<Team>(`/teams/${teamId}`, data),

    delete: (teamId: string) => apiClient.delete(`/teams/${teamId}`),

    // Members
    getMembers: (teamId: string) =>
        apiClient.get<TeamMember[]>(`/teams/${teamId}/members`),

    addMember: (teamId: string, userId: string, role: string) =>
        apiClient.post<TeamMember>(`/teams/${teamId}/members`, { userId, role }),

    updateMemberRole: (teamId: string, memberId: string, role: string) =>
        apiClient.patch<TeamMember>(`/teams/${teamId}/members/${memberId}`, { role }),

    removeMember: (teamId: string, memberId: string) =>
        apiClient.delete(`/teams/${teamId}/members/${memberId}`),

    // Invites
    getInvites: (teamId: string) =>
        apiClient.get<TeamInvite[]>(`/teams/${teamId}/invites`),

    invite: (teamId: string, email: string, role: string) =>
        apiClient.post<TeamInvite>(`/teams/${teamId}/invites`, { email, role }),

    cancelInvite: (teamId: string, inviteId: string) =>
        apiClient.delete(`/teams/${teamId}/invites/${inviteId}`),

    acceptInvite: (inviteToken: string) =>
        apiClient.post<Team>(`/invites/${inviteToken}/accept`),
};
