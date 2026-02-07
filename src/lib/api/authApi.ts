import type { User } from '@/types';
import { apiClient } from './client';

// Auth API
export const authApi = {
    login: (email: string, password: string) =>
        apiClient.post<{ user: User; token: string }>('/auth/login', { email, password }),

    signup: (email: string, password: string, name: string) =>
        apiClient.post<{ user: User; token: string }>('/auth/signup', { email, password, name }),

    logout: () => apiClient.post('/auth/logout'),

    me: () => apiClient.get<User>('/auth/me'),

    updateProfile: (data: Partial<User>) =>
        apiClient.patch<User>('/auth/me', data),

    changePassword: (currentPassword: string, newPassword: string) =>
        apiClient.post('/auth/change-password', { currentPassword, newPassword }),
};
