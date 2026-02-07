/**
 * Cloudflare Yjs Provider for PRD Real-time Collaboration
 * 
 * Handles both document sync (Yjs) and cursor sync via Cloudflare Durable Objects.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import * as Y from 'yjs';

type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'synced';

export interface RemoteCursor {
    odId: string;
    name: string;
    color: string;
    position: number;
    lastUpdate: number;
}

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
    remoteCursors: Map<string, RemoteCursor>;
    updateCursorPosition: (position: number) => void;
}

// Cloudflare Worker URL
const WORKER_URL = import.meta.env.VITE_COLLAB_WORKER_URL || 'https://lilpm-collab.pfct.workers.dev';

/**
 * CloudflareYjsProvider - handles Yjs doc sync and cursor positions
 */
export class CloudflareYjsProvider {
    private ws: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    public doc: Y.Doc;
    public roomId: string;
    public userInfo: { id: string; name: string; color: string };
    public remoteCursors: Map<string, RemoteCursor> = new Map();
    public onStatusChange: ((status: SyncStatus) => void) | null = null;
    public onSync: (() => void) | null = null;
    public onCursorsChange: ((cursors: Map<string, RemoteCursor>) => void) | null = null;

    constructor(doc: Y.Doc, roomId: string, userInfo: { id: string; name: string; color: string }) {
        this.doc = doc;
        this.roomId = roomId;
        this.userInfo = userInfo;

        // Listen for local document updates
        this.doc.on('update', this.handleLocalUpdate);
    }

    connect() {
        const wsUrl = `${WORKER_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/room/${this.roomId}`;

        console.log('[CloudflareProvider] Connecting to:', wsUrl);
        this.onStatusChange?.('connecting');

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('[CloudflareProvider] Connected');
            this.onStatusChange?.('connected');
            // Broadcast initial cursor position
            this.updateCursorPosition(0);
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);

                if (msg.type === 'sync') {
                    // Initial sync - apply full state from server
                    if (msg.data && msg.data.length > 0) {
                        const update = new Uint8Array(msg.data);
                        Y.applyUpdate(this.doc, update, 'remote');
                        console.log('[CloudflareProvider] Initial sync received, doc size:', msg.data.length);
                    } else {
                        console.log('[CloudflareProvider] Initial sync received (empty doc)');
                    }
                    this.onStatusChange?.('synced');
                    this.onSync?.();
                } else if (msg.type === 'update') {
                    // Incremental update from another user
                    const update = new Uint8Array(msg.data);
                    Y.applyUpdate(this.doc, update, 'remote');
                    console.log('[CloudflareProvider] Received update from peer');
                } else if (msg.type === 'cursor') {
                    // Cursor update from other users
                    if (msg.userId !== this.userInfo.id) {
                        console.log('[CloudflareProvider] Remote cursor update:', msg.userName, 'pos:', msg.position);
                        this.remoteCursors.set(msg.userId, {
                            odId: msg.userId,
                            name: msg.userName,
                            color: msg.color,
                            position: msg.position,
                            lastUpdate: Date.now(),
                        });
                        this.onCursorsChange?.(new Map(this.remoteCursors));
                    }
                } else if (msg.type === 'leave') {
                    // User left
                    if (msg.userId !== this.userInfo.id) {
                        console.log('[CloudflareProvider] User left:', msg.userId);
                        this.remoteCursors.delete(msg.userId);
                        this.onCursorsChange?.(new Map(this.remoteCursors));
                    }
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
                if (this.ws?.readyState !== WebSocket.OPEN) {
                    this.connect();
                }
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

    updateCursorPosition(position: number) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'cursor',
                userId: this.userInfo.id,
                userName: this.userInfo.name,
                color: this.userInfo.color,
                position,
            }));
        }
    }

    private handleLocalUpdate = (update: Uint8Array, origin: any) => {
        // Don't send updates that came from remote
        if (origin === 'remote') return;

        console.log('[CloudflareProvider] Sending local update, size:', update.length);

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'update',
                data: Array.from(update),
            }));
        }
    };
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

    // Use useState so changes trigger re-renders
    const [yjsDoc, setYjsDoc] = useState<Y.Doc | null>(null);
    const [provider, setProvider] = useState<CloudflareYjsProvider | null>(null);
    const [status, setStatus] = useState<SyncStatus>('disconnected');
    const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());

    // Create room name from team and document ID
    const roomId = useMemo(() => `${teamId}-prd-${documentId}`, [teamId, documentId]);

    const updateCursorPosition = useCallback((position: number) => {
        provider?.updateCursorPosition(position);
    }, [provider]);

    useEffect(() => {
        if (!enabled || !documentId || !teamId || !userId) {
            return;
        }

        console.log('[useCloudflareCollaboration] Initializing for room:', roomId);

        // Create Yjs document
        const doc = new Y.Doc();

        // Create provider
        const newProvider = new CloudflareYjsProvider(doc, roomId, {
            id: userId,
            name: userName,
            color: userColor || getRandomColor(),
        });

        // Listen for status changes
        newProvider.onStatusChange = (newStatus) => {
            console.log('[useCloudflareCollaboration] Status changed:', newStatus);
            setStatus(newStatus);
        };

        // Listen for cursor changes
        newProvider.onCursorsChange = (cursors) => {
            console.log('[useCloudflareCollaboration] Cursors updated:', cursors.size);
            setRemoteCursors(cursors);
        };

        // Set state BEFORE connecting so editor can mount with the doc
        setYjsDoc(doc);
        setProvider(newProvider);

        // Connect
        newProvider.connect();

        return () => {
            console.log('[useCloudflareCollaboration] Cleanup');
            newProvider.destroy();
            doc.destroy();
            setYjsDoc(null);
            setProvider(null);
            setStatus('disconnected');
            setRemoteCursors(new Map());
        };
    }, [enabled, documentId, teamId, userId, userName, userColor, roomId]);

    return {
        yjsDoc,
        provider,
        status,
        isConnected: status === 'connected' || status === 'synced',
        isSynced: status === 'synced',
        remoteCursors,
        updateCursorPosition,
    };
}

function getRandomColor(): string {
    const colors = [
        '#F87171', '#FB923C', '#FBBF24', '#4ADE80', '#22D3EE',
        '#60A5FA', '#A78BFA', '#F472B6', '#94A3B8'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
