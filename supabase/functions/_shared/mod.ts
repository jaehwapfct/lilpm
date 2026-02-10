/**
 * Shared module barrel file for Supabase Edge Functions
 * 
 * Usage in edge functions:
 *   import { corsHeaders, handleCors, env, createAdminClient, sendEmail, jsonResponse, errorResponse } from '../_shared/mod.ts';
 */

export { corsHeaders, handleCors } from './cors.ts';
export { env } from './env.ts';
export { createAdminClient, createClient, type SupabaseClient } from './supabase.ts';
export { sendGmailEmail, sendResendEmail, sendEmail, type EmailResult } from './email.ts';
export { jsonResponse, errorResponse, versionedResponse, versionedError } from './response.ts';
