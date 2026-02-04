import type { 
  User, 
  Team, 
  TeamMember, 
  TeamInvite,
  Project, 
  Issue, 
  Label, 
  Cycle,
  Comment,
  Activity,
  LilyMessage,
  PRDDocument,
  ApiResponse,
  PaginatedResponse,
  ViewFilters
} from '@/types';

// API Configuration - Replace with your actual backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const LILY_MCP_URL = import.meta.env.VITE_LILY_MCP_URL || '/api/lily';

// HTTP Client with authentication
class ApiClient {
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

// Lily MCP API
export const lilyApi = {
  sendMessage: (message: string, context?: { teamId?: string; projectId?: string }) =>
    lilyClient.post<LilyMessage>('/chat', { message, context }),

  getHistory: (conversationId: string) =>
    lilyClient.get<LilyMessage[]>(`/conversations/${conversationId}/messages`),

  generatePRD: (conversationId: string) =>
    lilyClient.post<PRDDocument>(`/conversations/${conversationId}/generate-prd`),

  generateTickets: (prdId: string, teamId: string) =>
    lilyClient.post<Issue[]>(`/prd/${prdId}/generate-tickets`, { teamId }),

  getDataSources: () =>
    lilyClient.get<{ id: string; name: string; type: string }[]>('/data-sources'),

  queryDataSource: (sourceId: string, query: string) =>
    lilyClient.post<unknown>(`/data-sources/${sourceId}/query`, { query }),
};

// Real-time collaboration WebSocket
export class CollaborationClient {
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  connect(roomId: string, token: string) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    this.ws = new WebSocket(`${wsUrl}/rooms/${roomId}?token=${token}`);
    this.roomId = roomId;

    this.ws.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        this.emit(type, data);
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    this.ws.onclose = () => {
      this.emit('disconnected', null);
    };

    this.ws.onerror = (error) => {
      this.emit('error', error);
    };

    return new Promise<void>((resolve, reject) => {
      if (!this.ws) return reject(new Error('WebSocket not initialized'));
      this.ws.onopen = () => {
        this.emit('connected', null);
        resolve();
      };
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.roomId = null;
    }
  }

  send(type: string, data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: (data: unknown) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown) {
    this.listeners.get(event)?.forEach((callback) => callback(data));
  }

  // Presence methods
  updatePresence(presence: { cursor?: { x: number; y: number }; focusedIssueId?: string }) {
    this.send('presence:update', presence);
  }

  // Issue updates
  broadcastIssueUpdate(issueId: string, changes: Partial<Issue>) {
    this.send('issue:update', { issueId, changes });
  }
}

export const collaborationClient = new CollaborationClient();
