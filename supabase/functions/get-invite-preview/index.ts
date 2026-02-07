// Deno Edge Function for getting invite preview without authentication
// Uses service role to bypass RLS

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get token from request body
        const { token } = await req.json().catch(() => ({ token: null }));

        if (!token) {
            return new Response(
                JSON.stringify({ error: 'Missing token parameter' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Use service role to bypass RLS
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
            return new Response(
                JSON.stringify({
                    valid: false,
                    status: 'not_found',
                    error: 'Failed to retrieve invitation'
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!invite) {
            return new Response(
                JSON.stringify({ valid: false, status: 'not_found' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check if expired
        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            return new Response(
                JSON.stringify({
                    valid: false,
                    status: 'expired',
                    teamName: (invite.team as any)?.name,
                    inviterName: (invite.inviter as any)?.name,
                    inviterAvatar: (invite.inviter as any)?.avatar_url,
                    email: invite.email,
                    role: invite.role,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check status
        if (invite.status !== 'pending') {
            return new Response(
                JSON.stringify({
                    valid: false,
                    status: invite.status,
                    teamName: (invite.team as any)?.name,
                    inviterName: (invite.inviter as any)?.name,
                    inviterAvatar: (invite.inviter as any)?.avatar_url,
                    email: invite.email,
                    role: invite.role,
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Valid pending invite
        return new Response(
            JSON.stringify({
                valid: true,
                status: 'pending',
                teamName: (invite.team as any)?.name,
                teamId: (invite.team as any)?.id,
                inviterName: (invite.inviter as any)?.name,
                inviterAvatar: (invite.inviter as any)?.avatar_url,
                email: invite.email,
                role: invite.role,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Unexpected error:', error);
        return new Response(
            JSON.stringify({
                valid: false,
                status: 'error',
                error: 'An unexpected error occurred'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
