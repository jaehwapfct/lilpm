/**
 * Cloudflare Yjs Provider for PRD Real-time Collaboration
 * 
 * Connects to our Cloudflare Workers Durable Objects backend for Yjs sync.
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as Y from 'yjs';

type SyncStatus = 'connecting' | 'connected' | 'disconnected' | 'synced';

interface UseCloudflareCollaborationOptions {
    documentId: string;
    teamId: string;
    userId: string;
    userName: string;
    userColor?: string;
    avatarUrl?: string;
    enabled?: boolean;
}

interface UseCloudflareCollaborationReturn {
    yjsDoc: Y.Doc | null;
    provider: CloudflareYjsProvider | null;
    status: SyncStatus;
    isConnected: boolean;
    isSynced: boolean;
}

// Cloudflare Worker URL
const WORKER_URL = import.meta.env.VITE_COLLAB_WORKER_URL || 'https://lilpm-collab.pfct.workers.dev';

/**
 * Custom Yjs Provider for Cloudflare Workers
 */
class CloudflareYjsProvider {
    private ws: WebSocket | null = null;
    private doc: Y.Doc;
    private roomId: string;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private _awareness: {
        getLocalState: () => any;
        setLocalState: (state: any) => void;
        localState: any;
    };

    public onStatusChange: ((status: SyncStatus) => void) | null = null;
    public onSync: ((synced: boolean) => void) | null = null;

    constructor(doc: Y.Doc, roomId: string, userInfo: { id: string; name: string; color: string }) {
        this.doc = doc;
        this.roomId = roomId;

        // Simple awareness implementation
        this._awareness = {
            localState: { user: userInfo },
            getLocalState: () => this._awareness.localState,
            setLocalState: (state: any) => {
                this._awareness.localState = state;
                this.sendAwareness();
            },
        };

        // Listen for local document updates
        this.doc.on('update', this.handleLocalUpdate);
    }

    get awareness() {
        return this._awareness;
    }

    connect() {
        const wsUrl = `${WORKER_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/room/${this.roomId}`;

        console.log('[CloudflareProvider] Connecting to:', wsUrl);
        this.onStatusChange?.('connecting');

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('[CloudflareProvider] Connected');
            this.onStatusChange?.('connected');
            this.sendAwareness();
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                if (msg.type === 'sync') {
                    // Initial sync - apply full state
                    const update = new Uint8Array(msg.data);
                    Y.applyUpdate(this.doc, update, 'remote');
                    console.log('[CloudflareProvider] Initial sync received');
                    this.onSync?.(true);
                    this.onStatusChange?.('synced');
                } else if (msg.type === 'update') {
                    // Incremental update
                    const update = new Uint8Array(msg.data);
                    Y.applyUpdate(this.doc, update, 'remote');
                } else if (msg.type === 'awareness') {
                    // Awareness update (cursors, etc.)
                    console.log('[CloudflareProvider] Awareness update:', msg.data);
                }
            } catch (error) {
                console.error('[CloudflareProvider] Error parsing message:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('[CloudflareProvider] Disconnected:', event.code, event.reason);
            this.onStatusChange?.('disconnected');

            // Reconnect after delay
            this.reconnectTimer = setTimeout(() => {
                this.connect();
            }, 3000);
        };

        this.ws.onerror = (error) => {
            console.error('[CloudflareProvider] WebSocket error:', error);
        };
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.doc.off('update', this.handleLocalUpdate);
    }

    destroy() {
        this.disconnect();
    }

    private handleLocalUpdate = (update: Uint8Array, origin: any) => {
        // Don't send updates that came from remote
        if (origin === 'remote') return;

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'update',
                data: Array.from(update),
            }));
        }
    };

    private sendAwareness() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'awareness',
                data: this._awareness.localState,
            }));
        }
    }
}

export function useCloudflareCollaboration(options: UseCloudflareCollaborationOptions): UseCloudflareCollaborationReturn {
    const {
        documentId,
        teamId,
        userId,
        userName,
        userColor,
        enabled = true,
    } = options;

    const [status, setStatus] = useState<SyncStatus>('disconnected');
    const docRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<CloudflareYjsProvider | null>(null);

    // Create room name from team and document ID
    const roomId = useMemo(() => `${teamId}-prd-${documentId}`, [teamId, documentId]);

    useEffect(() => {
        if (!enabled || !documentId || !teamId || !userId) {
            return;
        }

        console.log('[useCloudflareCollaboration] Initializing for room:', roomId);

        // Create Yjs document
        const doc = new Y.Doc();
        docRef.current = doc;

        // Create provider
        const provider = new CloudflareYjsProvider(doc, roomId, {
            id: userId,
            name: userName,
            color: userColor || getRandomColor(),
        });
        providerRef.current = provider;

        // Listen for status changes
        provider.onStatusChange = (newStatus) => {
            setStatus(newStatus);
        };

        // Connect
        provider.connect();

        return () => {
            provider.destroy();
            doc.destroy();
            docRef.current = null;
            providerRef.current = null;
            setStatus('disconnected');
        };
    }, [enabled, documentId, teamId, userId, userName, userColor, roomId]);

    return {
        yjsDoc: docRef.current,
        provider: providerRef.current,
        status,
        isConnected: status === 'connected' || status === 'synced',
        isSynced: status === 'synced',
    };
}

function getRandomColor(): string {
    const colors = [
        '#F87171', '#FB923C', '#FBBF24', '#4ADE80', '#22D3EE',
        '#60A5FA', '#A78BFA', '#F472B6', '#94A3B8'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
