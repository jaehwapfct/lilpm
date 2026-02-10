/**
 * Cloudflare Yjs Provider for Real-time Collaboration
 * 
 * Connects to a Cloudflare Durable Object via WebSocket for:
 * - Yjs CRDT document sync (conflict-free concurrent editing)
 * - Yjs Awareness protocol (cursor positions, text selections, user presence)
 * - Offline support (Yjs queues changes and syncs on reconnect)
 * 
 * Works with both PRD and Issue editors via Tiptap's Collaboration extension.
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from 'y-protocols/awareness';

type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'synced';

export interface RemoteCursor {
    odId: string;
    id: string;
    name: string;
    color: string;
    avatar?: string;
    position: number;
    blockId?: string;
    lastUpdate: number;
}

interface UseCloudflareCollaborationOptions {
    /** Document ID (prdId or issueId) */
    documentId: string;
    /** Document type for room naming */
    documentType?: 'prd' | 'issue';
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
    updateCursorPosition: (position: number, blockId?: string) => void;
}

// Cloudflare Worker URL
const WORKER_URL = import.meta.env.VITE_COLLAB_WORKER_URL || 'https://lilpm-collab.pfct.workers.dev';

/**
 * CloudflareYjsProvider
 * 
 * Manages WebSocket connection to Cloudflare Durable Object for Yjs sync.
 * Implements the standard y-protocols Awareness protocol for TiptapCollaborationCursor compatibility.
 */
export class CloudflareYjsProvider {
    private ws: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private reconnectAttempts = 0;
    private readonly MAX_RECONNECT_DELAY = 30000;

    public doc: Y.Doc;
    public roomId: string;
    public userInfo: { id: string; name: string; color: string; avatar?: string };
    public remoteCursors: Map<string, RemoteCursor> = new Map();
    public onStatusChange: ((status: SyncStatus) => void) | null = null;
    public onSync: (() => void) | null = null;
    public onCursorsChange: ((cursors: Map<string, RemoteCursor>) => void) | null = null;

    // Yjs Awareness for TiptapCollaborationCursor
    public awareness: Awareness;

    constructor(
        doc: Y.Doc,
        roomId: string,
        userInfo: { id: string; name: string; color: string; avatar?: string }
    ) {
        this.doc = doc;
        this.roomId = roomId;
        this.userInfo = userInfo;

        // Initialize Awareness protocol
        this.awareness = new Awareness(doc);

        // Set local user state (used by TiptapCollaborationCursor to display user name/color)
        this.awareness.setLocalState({
            user: {
                name: userInfo.name,
                color: userInfo.color,
                avatar: userInfo.avatar,
            },
        });

        // When local awareness state changes, broadcast to server
        this.awareness.on('update', this.handleAwarenessUpdate);

        // When local doc changes, send update to server
        this.doc.on('update', this.handleLocalDocUpdate);
    }

    connect() {
        const wsUrl = `${WORKER_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/room/${this.roomId}`;

        console.log('[CloudflareProvider] Connecting to:', wsUrl);
        this.onStatusChange?.('connecting');

        try {
            this.ws = new WebSocket(wsUrl);
        } catch (e) {
            console.error('[CloudflareProvider] Failed to create WebSocket:', e);
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            console.log('[CloudflareProvider] Connected');
            this.reconnectAttempts = 0;
            this.onStatusChange?.('connected');

            // Send our full awareness state so other clients know about us
            this.broadcastAwareness([this.doc.clientID]);
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this.handleServerMessage(msg);
            } catch (error) {
                console.error('[CloudflareProvider] Error parsing message:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('[CloudflareProvider] Disconnected:', event.code, event.reason);
            this.onStatusChange?.('disconnected');
            this.ws = null;
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('[CloudflareProvider] WebSocket error:', error);
        };
    }

    private scheduleReconnect() {
        if (this.reconnectTimer) return; // Already scheduled

        // Exponential backoff: 1s, 2s, 4s, 8s... up to MAX_RECONNECT_DELAY
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.MAX_RECONNECT_DELAY);
        this.reconnectAttempts++;

        console.log(`[CloudflareProvider] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                this.connect();
            }
        }, delay);
    }

    private handleServerMessage(msg: any) {
        switch (msg.type) {
            case 'sync': {
                // Initial document state from server
                if (msg.data && msg.data.length > 0) {
                    const update = new Uint8Array(msg.data);
                    Y.applyUpdate(this.doc, update, 'server-sync');
                    console.log('[CloudflareProvider] Initial sync, doc size:', msg.data.length);
                }
                this.onStatusChange?.('synced');
                this.onSync?.();

                // After sync, re-broadcast our awareness so others see us
                this.broadcastAwareness([this.doc.clientID]);
                break;
            }

            case 'update': {
                // Incremental Yjs update from another client
                if (msg.data) {
                    const update = new Uint8Array(msg.data);
                    Y.applyUpdate(this.doc, update, 'remote');
                }
                break;
            }

            case 'awareness': {
                // Awareness update from server (encoded y-protocols awareness data)
                if (msg.data) {
                    try {
                        const update = new Uint8Array(msg.data);
                        applyAwarenessUpdate(this.awareness, update, 'remote');
                    } catch (e) {
                        console.error('[CloudflareProvider] Failed to apply awareness update:', e);
                    }
                }
                break;
            }

            case 'cursor': {
                // Legacy cursor update (for backward compatibility)
                if (msg.userId && msg.userId !== this.userInfo.id) {
                    this.remoteCursors.set(msg.userId, {
                        odId: msg.userId,
                        id: msg.userId,
                        name: msg.userName,
                        color: msg.color,
                        avatar: msg.avatar,
                        position: msg.position || 0,
                        blockId: msg.blockId,
                        lastUpdate: Date.now(),
                    });
                    this.onCursorsChange?.(new Map(this.remoteCursors));
                }
                break;
            }

            case 'leave': {
                // User disconnected
                if (msg.userId && msg.userId !== this.userInfo.id) {
                    console.log('[CloudflareProvider] User left:', msg.userName || msg.userId);
                    this.remoteCursors.delete(msg.userId);
                    this.onCursorsChange?.(new Map(this.remoteCursors));

                    // Remove from awareness
                    if (msg.clientId) {
                        removeAwarenessStates(this.awareness, [msg.clientId], 'remote');
                    }
                }
                break;
            }
        }
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

        this.doc.off('update', this.handleLocalDocUpdate);
        this.awareness.off('update', this.handleAwarenessUpdate);
    }

    destroy() {
        this.disconnect();
        this.awareness.destroy();
    }

    /**
     * Update cursor position and optionally the block ID being edited.
     * This is sent both via the awareness protocol (for TiptapCollaborationCursor)
     * and as a legacy cursor message (for CursorOverlay/BlockPresenceIndicator).
     */
    updateCursorPosition(position: number, blockId?: string) {
        // Update awareness state (TiptapCollaborationCursor reads from here)
        const currentState = this.awareness.getLocalState() || {};
        this.awareness.setLocalState({
            ...currentState,
            user: currentState.user || {
                name: this.userInfo.name,
                color: this.userInfo.color,
                avatar: this.userInfo.avatar,
            },
            cursor: { anchor: position, head: position },
        });

        // Also send legacy cursor message (for CursorOverlay compatibility)
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'cursor',
                userId: this.userInfo.id,
                userName: this.userInfo.name,
                color: this.userInfo.color,
                avatar: this.userInfo.avatar,
                blockId,
                position,
            }));
        }
    }

    /**
     * Broadcast awareness update via WebSocket using y-protocols encoding
     */
    private broadcastAwareness(changedClients: number[]) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        try {
            const encoded = encodeAwarenessUpdate(this.awareness, changedClients);
            this.ws.send(JSON.stringify({
                type: 'awareness',
                data: Array.from(encoded),
                clientId: this.doc.clientID,
                userId: this.userInfo.id,
                userName: this.userInfo.name,
            }));
        } catch (e) {
            console.error('[CloudflareProvider] Failed to encode awareness:', e);
        }
    }

    /**
     * Handle awareness 'update' event - broadcast changes to server
     */
    private handleAwarenessUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
        const changedClients = [...added, ...updated, ...removed];
        if (changedClients.length === 0) return;

        // Only broadcast if OUR state changed (not remote updates)
        if (changedClients.includes(this.doc.clientID)) {
            this.broadcastAwareness(changedClients.filter(id => id === this.doc.clientID));
        }
    };

    /**
     * Handle local Yjs doc update - send to server for relay
     */
    private handleLocalDocUpdate = (update: Uint8Array, origin: any) => {
        // Don't re-broadcast updates that came from remote
        if (origin === 'remote' || origin === 'server-sync') return;

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'update',
                data: Array.from(update),
            }));
        }
    };
}

// ─── React Hook ─────────────────────────────────────────────────────────────

export function useCloudflareCollaboration(options: UseCloudflareCollaborationOptions): UseCloudflareCollaborationReturn {
    const {
        documentId,
        documentType = 'prd',
        teamId,
        userId,
        userName,
        userColor,
        avatarUrl,
        enabled = true,
    } = options;

    const [yjsDoc, setYjsDoc] = useState<Y.Doc | null>(null);
    const [provider, setProvider] = useState<CloudflareYjsProvider | null>(null);
    const [status, setStatus] = useState<SyncStatus>('disconnected');
    const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());

    // Stable room ID
    const roomId = useMemo(() => `${teamId}-${documentType}-${documentId}`, [teamId, documentType, documentId]);

    // Stable user info ref (don't recreate provider when display info changes)
    const userInfoRef = useRef({ id: userId, name: userName, color: userColor || getRandomColor(), avatar: avatarUrl });
    useEffect(() => {
        userInfoRef.current = { id: userId, name: userName, color: userColor || userInfoRef.current.color, avatar: avatarUrl };
        // Update awareness when user info changes
        if (provider) {
            provider.userInfo = userInfoRef.current;
            const currentState = provider.awareness.getLocalState() || {};
            provider.awareness.setLocalState({
                ...currentState,
                user: {
                    name: userInfoRef.current.name,
                    color: userInfoRef.current.color,
                    avatar: userInfoRef.current.avatar,
                },
            });
        }
    }, [userId, userName, userColor, avatarUrl, provider]);

    const updateCursorPosition = useCallback((position: number, blockId?: string) => {
        provider?.updateCursorPosition(position, blockId);
    }, [provider]);

    useEffect(() => {
        if (!enabled || !documentId || !teamId || !userId) {
            return;
        }

        console.log('[useCloudflareCollaboration] Initializing room:', roomId);

        const doc = new Y.Doc();
        const newProvider = new CloudflareYjsProvider(doc, roomId, userInfoRef.current);

        newProvider.onStatusChange = (newStatus) => {
            console.log('[useCloudflareCollaboration] Status:', newStatus);
            setStatus(newStatus);
        };

        newProvider.onCursorsChange = (cursors) => {
            setRemoteCursors(cursors);
        };

        // Set state BEFORE connecting so editor can mount with the doc
        setYjsDoc(doc);
        setProvider(newProvider);

        // Connect to Cloudflare Durable Object
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
    // Only recreate when core identifiers change
    }, [enabled, documentId, teamId, userId, roomId]);

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
