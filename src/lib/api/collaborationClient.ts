import type { Issue } from '@/types';

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
