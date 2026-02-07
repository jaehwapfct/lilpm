import type { ApiResponse } from '@/types';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const LILY_MCP_URL = import.meta.env.VITE_LILY_MCP_URL || '/api/lily';

// HTTP Client with authentication
export class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        this.token = localStorage.getItem('auth_token');
    }

    setToken(token: string | null) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            ...options.headers,
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers,
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    data: null as unknown as T,
                    success: false,
                    error: data.error || `HTTP ${response.status}`,
                };
            }

            return { data, success: true };
        } catch (error) {
            return {
                data: null as unknown as T,
                success: false,
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }

    get<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    post<T>(endpoint: string, body?: unknown) {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    put<T>(endpoint: string, body?: unknown) {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    patch<T>(endpoint: string, body?: unknown) {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    delete<T>(endpoint: string) {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const apiClient = new ApiClient(API_BASE_URL);
export const lilyClient = new ApiClient(LILY_MCP_URL);
