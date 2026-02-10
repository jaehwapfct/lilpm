/**
 * Yjs Room Durable Object
 * 
 * Manages real-time collaboration for a single document room.
 * Handles:
 * - Yjs CRDT document sync (binary updates)
 * - Yjs Awareness protocol relay (cursor positions, selections, user info)
 * - Client connection lifecycle (join, leave)
 * - Document persistence via Durable Object storage
 */

import * as Y from 'yjs';

interface ClientInfo {
    clientId: string;
    userId?: string;
    userName?: string;
}

export class YjsRoom implements DurableObject {
    private doc: Y.Doc;
    private state: DurableObjectState;
    private connections: Map<WebSocket, ClientInfo>;
    private persistTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly PERSIST_DEBOUNCE_MS = 2000;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.doc = new Y.Doc();
        this.connections = new Map();

        // Load persisted document on startup
        this.state.blockConcurrencyWhile(async () => {
            const stored = await this.state.storage.get<number[]>('doc');
            if (stored) {
                try {
                    const update = new Uint8Array(stored);
                    Y.applyUpdate(this.doc, update);
                    console.log('[YjsRoom] Loaded persisted document, size:', stored.length);
                } catch (e) {
                    console.error('[YjsRoom] Failed to load persisted document:', e);
                }
            }
        });

        // Listen for document updates and persist (debounced)
        this.doc.on('update', () => {
            this.schedulePersist();
        });
    }

    private schedulePersist() {
        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
        }
        this.persistTimer = setTimeout(() => {
            try {
                const currentState = Y.encodeStateAsUpdate(this.doc);
                this.state.storage.put('doc', Array.from(currentState));
                console.log('[YjsRoom] Persisted document, size:', currentState.length);
            } catch (e) {
                console.error('[YjsRoom] Failed to persist document:', e);
            }
        }, this.PERSIST_DEBOUNCE_MS);
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // Handle WebSocket upgrade
        if (request.headers.get('Upgrade') === 'websocket') {
            const pair = new WebSocketPair();
            const [client, server] = Object.values(pair);

            // Accept WebSocket with hibernation API
            this.state.acceptWebSocket(server);

            const clientId = crypto.randomUUID();
            this.connections.set(server, { clientId });

            console.log(`[YjsRoom] Client connected: ${clientId}, total: ${this.connections.size}`);

            // Send current document state to new client
            const currentState = Y.encodeStateAsUpdate(this.doc);
            server.send(JSON.stringify({
                type: 'sync',
                data: Array.from(currentState),
            }));

            // Send existing awareness states from other clients
            // Collect last known awareness from all other connected clients
            for (const [conn, info] of this.connections) {
                if (conn !== server && info.userId) {
                    // Notify existing client about the new joiner (they can re-send their awareness)
                }
            }

            return new Response(null, {
                status: 101,
                webSocket: client,
            });
        }

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                },
            });
        }

        // Health check
        if (url.pathname.endsWith('/health')) {
            return new Response(JSON.stringify({
                status: 'ok',
                connections: this.connections.size,
                docSize: Y.encodeStateAsUpdate(this.doc).length,
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        return new Response('Yjs Room - WebSocket endpoint', {
            status: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
        });
    }

    /**
     * Broadcast a message to all clients except the sender
     */
    private broadcast(sender: WebSocket, message: string) {
        for (const [conn] of this.connections) {
            if (conn !== sender && conn.readyState === WebSocket.OPEN) {
                try {
                    conn.send(message);
                } catch (e) {
                    console.error('[YjsRoom] Failed to send to client:', e);
                }
            }
        }
    }

    /**
     * Broadcast a message to ALL clients (including sender)
     */
    private broadcastAll(message: string) {
        for (const [conn] of this.connections) {
            if (conn.readyState === WebSocket.OPEN) {
                try {
                    conn.send(message);
                } catch (e) {
                    console.error('[YjsRoom] Failed to send to client:', e);
                }
            }
        }
    }

    // Handle incoming WebSocket messages (hibernation API)
    async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
        try {
            const msg = typeof message === 'string'
                ? JSON.parse(message)
                : JSON.parse(new TextDecoder().decode(message));

            switch (msg.type) {
                case 'update': {
                    // Yjs document update
                    if (!msg.data) break;
                    const update = new Uint8Array(msg.data);
                    Y.applyUpdate(this.doc, update, ws);

                    // Relay to other clients
                    this.broadcast(ws, JSON.stringify({
                        type: 'update',
                        data: msg.data,
                    }));
                    break;
                }

                case 'awareness': {
                    // Yjs Awareness update (cursor, selection, user info)
                    // Relay encoded awareness data to all other clients
                    if (!msg.data) break;

                    // Store userId for leave tracking
                    const info = this.connections.get(ws);
                    if (info && msg.clientId) {
                        info.userId = msg.userId;
                        info.userName = msg.userName;
                    }

                    this.broadcast(ws, JSON.stringify({
                        type: 'awareness',
                        data: msg.data,
                        clientId: msg.clientId,
                    }));
                    break;
                }

                case 'cursor': {
                    // Legacy cursor update (non-awareness based)
                    // Store userId for leave tracking
                    const cursorInfo = this.connections.get(ws);
                    if (cursorInfo) {
                        cursorInfo.userId = msg.userId;
                        cursorInfo.userName = msg.userName;
                    }

                    this.broadcast(ws, JSON.stringify({
                        type: 'cursor',
                        userId: msg.userId,
                        userName: msg.userName,
                        color: msg.color,
                        avatar: msg.avatar,
                        blockId: msg.blockId,
                        position: msg.position,
                        selection: msg.selection, // { anchor, head } for text selection
                    }));
                    break;
                }

                default:
                    console.warn('[YjsRoom] Unknown message type:', msg.type);
            }
        } catch (error) {
            console.error('[YjsRoom] Error processing message:', error);
        }
    }

    // Handle WebSocket close (hibernation API)
    async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
        const info = this.connections.get(ws);
        this.connections.delete(ws);

        console.log(`[YjsRoom] Client disconnected: ${info?.clientId} (${info?.userName}), remaining: ${this.connections.size}`);

        // Broadcast leave event to remaining clients
        if (info?.userId) {
            this.broadcastAll(JSON.stringify({
                type: 'leave',
                userId: info.userId,
                userName: info.userName,
                clientId: info.clientId,
            }));
        }

        // Persist document when last client disconnects
        if (this.connections.size === 0) {
            this.schedulePersist();
        }
    }

    // Handle WebSocket error (hibernation API)
    async webSocketError(ws: WebSocket, error: unknown) {
        console.error('[YjsRoom] WebSocket error:', error);
        const info = this.connections.get(ws);
        this.connections.delete(ws);

        // Broadcast leave event
        if (info?.userId) {
            this.broadcastAll(JSON.stringify({
                type: 'leave',
                userId: info.userId,
                userName: info.userName,
                clientId: info.clientId,
            }));
        }
    }
}

interface Env {
    YJS_ROOM: DurableObjectNamespace;
    ALLOWED_ORIGINS: string;
}
