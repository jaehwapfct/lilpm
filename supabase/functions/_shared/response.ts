/**
 * Shared response helpers for Edge Functions
 * Provides consistent response formatting across all endpoints
 */

import { corsHeaders } from './cors.ts';

const JSON_HEADERS = {
  ...corsHeaders,
  'Content-Type': 'application/json',
};

/**
 * Create a successful JSON response
 */
export function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });
}

/**
 * Create an error JSON response
 */
export function errorResponse(
  error: string,
  status = 500,
  extra?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({ error, ...extra }),
    {
      status,
      headers: JSON_HEADERS,
    }
  );
}

/**
 * Create a versioned JSON response (includes function version)
 */
export function versionedResponse(
  data: Record<string, unknown>,
  version: string,
  status = 200
): Response {
  return jsonResponse({ ...data, version }, status);
}

/**
 * Create a versioned error response
 */
export function versionedError(
  error: string,
  version: string,
  status = 500,
  extra?: Record<string, unknown>
): Response {
  return errorResponse(error, status, { version, ...extra });
}
