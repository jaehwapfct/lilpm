import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/mod.ts';

const FUNCTION_VERSION = '1.1.0'; // Refactored to use shared modules

interface MCPRequest {
  endpoint: string;
  apiKey: string;
  action: string;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'ok', service: 'mcp-proxy', version: FUNCTION_VERSION }),
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body: MCPRequest = await req.json();
    const { endpoint, apiKey, action, params = {} } = body;

    if (!endpoint) {
      return errorResponse('endpoint is required', 400);
    }

    const baseUrl = endpoint.replace(/\/sse$/, '');

    console.log(`[MCP Proxy v${FUNCTION_VERSION}] Base URL: ${baseUrl}, Action: ${action}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Try multiple endpoint patterns
    const patterns = [
      { url: `${baseUrl}/tools/${action}`, body: params },
      { url: `${baseUrl}/tools/call`, body: { name: action, arguments: params } },
      { url: `${baseUrl}/rpc`, body: { jsonrpc: '2.0', id: Date.now(), method: action, params } },
      { url: `${baseUrl}/call`, body: { method: action, params } },
      { url: `${baseUrl}/api/${action}`, body: params },
      { url: `${baseUrl}/${action}`, body: params },
    ];

    const attempts: Array<{ pattern: string; status: number; error?: string }> = [];

    for (const pattern of patterns) {
      try {
        console.log(`[MCP Proxy] Trying: ${pattern.url}`);

        const response = await fetch(pattern.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(pattern.body),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[MCP Proxy] Success: ${pattern.url}`);

          return jsonResponse({
            success: true,
            data: data.result || data.data || data,
            pattern: pattern.url,
          });
        } else {
          const errorText = await response.text();
          attempts.push({ pattern: pattern.url, status: response.status, error: errorText.substring(0, 200) });
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        attempts.push({ pattern: pattern.url, status: 0, error });
      }
    }

    // All patterns failed
    console.log('[MCP Proxy] All patterns failed:', attempts);
    return errorResponse('All MCP endpoint patterns failed', 502, { attempts });
  } catch (error) {
    console.error('[MCP Proxy] Error:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
