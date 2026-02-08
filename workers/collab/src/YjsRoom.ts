/**
 * Yjs Room Durable Object (Simplified)
 * 
 * Manages real-time collaboration using simple WebSocket message relay.
 * Each room broadcasts messages to all connected clients.
 */

import * as Y from 'yjs';

export class YjsRoom implements DurableObject {
    private doc: Y.Doc;
    private state: DurableObjectState;
    private connections: Map<WebSocket, { clientId: string }>;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.doc = new Y.Doc();
        this.connections = new Map();

        // Load persisted document on startup
        this.state.blockConcurrencyWhile(async () => {
            const stored = await this.state.storage.get<number[]>('doc');
            if (stored) {
                const update = new Uint8Array(stored);
                Y.applyUpdate(this.doc, update);
                console.log('[YjsRoom] Loaded persisted document');
            }
        });

        // Listen for document updates and persist
        this.doc.on('update', (update: Uint8Array) => {
            const currentState = Y.encodeStateAsUpdate(this.doc);
            this.state.storage.put('doc', Array.from(currentState));
        });
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

    // Handle incoming WebSocket messages (hibernation API)
    async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
        try {
            const msg = typeof message === 'string'
                ? JSON.parse(message)
                : JSON.parse(new TextDecoder().decode(message));

            if (msg.type === 'update' && msg.data) {
                // Apply update to local doc
                const update = new Uint8Array(msg.data);
                Y.applyUpdate(this.doc, update, ws);

                // Broadcast to other clients
                for (const [conn] of this.connections) {
                    if (conn !== ws && conn.readyState === WebSocket.OPEN) {
                        conn.send(JSON.stringify({
                            type: 'update',
                            data: msg.data,
                        }));
                    }
                }
            } else if (msg.type === 'cursor') {
                // Broadcast cursor position to other clients
                console.log('[YjsRoom] Cursor update from:', msg.userName, 'pos:', msg.position, 'block:', msg.blockId);
                for (const [conn] of this.connections) {
                    if (conn !== ws && conn.readyState === WebSocket.OPEN) {
                        conn.send(JSON.stringify({
                            type: 'cursor',
                            userId: msg.userId,
                            userName: msg.userName,
                            color: msg.color,
                            avatar: msg.avatar,
                            blockId: msg.blockId,
                            position: msg.position,
                        }));
                    }
                }
            } else if (msg.type === 'awareness' && msg.data) {
                // Broadcast awareness to other clients
                for (const [conn] of this.connections) {
                    if (conn !== ws && conn.readyState === WebSocket.OPEN) {
                        conn.send(JSON.stringify({
                            type: 'awareness',
                            data: msg.data,
                        }));
                    }
                }
            }
        } catch (error) {
            console.error('[YjsRoom] Error processing message:', error);
        }
    }

    // Handle WebSocket close (hibernation API)
    async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
        const info = this.connections.get(ws);
        this.connections.delete(ws);
        console.log(`[YjsRoom] Client disconnected: ${info?.clientId}, remaining: ${this.connections.size}`);
    }

    // Handle WebSocket error (hibernation API)
    async webSocketError(ws: WebSocket, error: unknown) {
        console.error('[YjsRoom] WebSocket error:', error);
        this.connections.delete(ws);
    }
}

interface Env {
    YJS_ROOM: DurableObjectNamespace;
    ALLOWED_ORIGINS: string;
}
