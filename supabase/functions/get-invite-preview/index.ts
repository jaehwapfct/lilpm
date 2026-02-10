// Deno Edge Function for getting invite preview without authentication
// Uses service role to bypass RLS

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, createAdminClient, jsonResponse, errorResponse } from '../_shared/mod.ts';

const FUNCTION_VERSION = '2026-02-10.1'; // Refactored to use shared modules

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { token } = await req.json().catch(() => ({ token: null }));

    if (!token) {
      return errorResponse('Missing token parameter', 400);
    }

    const supabase = createAdminClient();

    // Get invite preview
    const { data: invite, error } = await supabase
      .from('team_invites')
      .select(`
        id,
        status,
        expires_at,
        email,
        role,
        team:teams(id, name),
        inviter:profiles!team_invites_invited_by_fkey(id, name, avatar_url)
      `)
      .eq('token', token)
      .maybeSingle();

    if (error) {
      console.error('Failed to get invite:', error);
      return jsonResponse({
        valid: false,
        status: 'not_found',
        error: 'Failed to retrieve invitation',
        version: FUNCTION_VERSION,
      });
    }

    if (!invite) {
      return jsonResponse({ valid: false, status: 'not_found', version: FUNCTION_VERSION });
    }

    const baseInfo = {
      teamName: (invite.team as any)?.name,
      inviterName: (invite.inviter as any)?.name,
      inviterAvatar: (invite.inviter as any)?.avatar_url,
      email: invite.email,
      role: invite.role,
      version: FUNCTION_VERSION,
    };

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return jsonResponse({ valid: false, status: 'expired', ...baseInfo });
    }

    // Check status
    if (invite.status !== 'pending') {
      return jsonResponse({ valid: false, status: invite.status, ...baseInfo });
    }

    // Valid pending invite
    return jsonResponse({
      valid: true,
      status: 'pending',
      teamId: (invite.team as any)?.id,
      ...baseInfo,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('An unexpected error occurred', 500);
  }
});
