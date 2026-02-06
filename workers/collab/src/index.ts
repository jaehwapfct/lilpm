/**
 * LilPM Collaboration Worker
 * 
 * Cloudflare Worker that routes WebSocket connections to Yjs Room Durable Objects.
 * Provides real-time document collaboration using Yjs CRDT.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Re-export the Durable Object class
export { YjsRoom } from './YjsRoom';

interface Env {
    YJS_ROOM: DurableObjectNamespace;
    ALLOWED_ORIGINS: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use('*', cors({
    origin: (origin, c) => {
        const allowed = c.env.ALLOWED_ORIGINS.split(',');
        if (!origin || allowed.includes(origin) || allowed.includes('*')) {
            return origin || '*';
        }
        return null;
    },
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Upgrade', 'Connection', 'Sec-WebSocket-Key', 'Sec-WebSocket-Version', 'Sec-WebSocket-Protocol'],
}));

// Health check
app.get('/', (c) => {
    return c.json({
        service: 'lilpm-collab',
        status: 'healthy',
        version: '1.0.0',
    });
});

// WebSocket connection to a room
app.get('/room/:roomId', async (c) => {
    const roomId = c.req.param('roomId');

    // Get Durable Object instance for this room
    const id = c.env.YJS_ROOM.idFromName(roomId);
    const room = c.env.YJS_ROOM.get(id);

    // Forward request to Durable Object
    return room.fetch(c.req.raw);
});

// Room info
app.get('/room/:roomId/info', async (c) => {
    const roomId = c.req.param('roomId');
    const id = c.env.YJS_ROOM.idFromName(roomId);
    const room = c.env.YJS_ROOM.get(id);

    // Get health/info from Durable Object
    const healthRequest = new Request(new URL('/health', c.req.url));
    return room.fetch(healthRequest);
});

export default app;
