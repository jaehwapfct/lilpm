import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MCPRequest {
  endpoint: string;
  apiKey: string;
  action: string;
  params?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", service: "mcp-proxy" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: MCPRequest = await req.json();
    const { endpoint, apiKey, action, params = {} } = body;

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "endpoint is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove /sse suffix to get base URL
    const baseUrl = endpoint.replace(/\/sse$/, "");
    
    console.log("[MCP Proxy] Base URL:", baseUrl);
    console.log("[MCP Proxy] Action:", action);
    console.log("[MCP Proxy] Has API Key:", !!apiKey);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    // Try multiple endpoint patterns
    const patterns = [
      { url: `${baseUrl}/tools/${action}`, method: "POST", body: params },
      { url: `${baseUrl}/tools/call`, method: "POST", body: { name: action, arguments: params } },
      { url: `${baseUrl}/rpc`, method: "POST", body: { jsonrpc: "2.0", id: Date.now(), method: action, params } },
      { url: `${baseUrl}/call`, method: "POST", body: { method: action, params } },
      { url: `${baseUrl}/api/${action}`, method: "POST", body: params },
      { url: `${baseUrl}/${action}`, method: "POST", body: params },
    ];

    const results: Array<{ pattern: string; status: number; data?: unknown; error?: string }> = [];

    for (const pattern of patterns) {
      try {
        console.log("[MCP Proxy] Trying:", pattern.url);
        
        const response = await fetch(pattern.url, {
          method: pattern.method,
          headers,
          body: JSON.stringify(pattern.body),
        });

        const status = response.status;
        
        if (response.ok) {
          const data = await response.json();
          console.log("[MCP Proxy] Success:", pattern.url, data);
          
          // Return successful result
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: data.result || data.data || data,
              pattern: pattern.url,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          const errorText = await response.text();
          results.push({ pattern: pattern.url, status, error: errorText.substring(0, 200) });
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : "Unknown error";
        results.push({ pattern: pattern.url, status: 0, error });
      }
    }

    // All patterns failed
    console.log("[MCP Proxy] All patterns failed:", results);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "All MCP endpoint patterns failed",
        attempts: results,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[MCP Proxy] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

