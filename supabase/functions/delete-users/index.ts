import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { user_ids } = await req.json()

        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            throw new Error('user_ids array is required')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const results: { userId: string; success: boolean; error?: string; details?: string[] }[] = []

        for (const userId of user_ids) {
            const details: string[] = []

            try {
                console.log(`Starting deletion for user: ${userId}`)

                // Get user email
                let userEmail = ''
                try {
                    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
                    userEmail = userData?.user?.email || ''
                    details.push(`User: ${userEmail || userId}`)
                } catch (e: any) {
                    details.push(`Could not get user: ${e.message}`)
                }

                // 1. DELETE user_ai_settings
                const { error: e1 } = await supabaseAdmin.from('user_ai_settings').delete().eq('user_id', userId)
                details.push(`user_ai_settings: ${e1 ? e1.message : 'ok'}`)

                // 2. DELETE prd_documents (not update to null - has NOT NULL constraint)
                const { error: e2 } = await supabaseAdmin.from('prd_documents').delete().eq('created_by', userId)
                details.push(`prd_documents: ${e2 ? e2.message : 'ok'}`)

                // 3. DELETE prd_projects created by user
                const { error: e3 } = await supabaseAdmin.from('prd_projects').delete().eq('created_by', userId)
                details.push(`prd_projects: ${e3 ? e3.message : 'ok'}`)

                // 4. DELETE team_members
                const { error: e4 } = await supabaseAdmin.from('team_members').delete().eq('user_id', userId)
                details.push(`team_members: ${e4 ? e4.message : 'ok'}`)

                // 5. UPDATE team_invites (invited_by)
                const { error: e5 } = await supabaseAdmin.from('team_invites').update({ invited_by: null }).eq('invited_by', userId)
                details.push(`team_invites: ${e5 ? e5.message : 'ok'}`)

                // 6. DELETE team_invites by email
                if (userEmail) {
                    const { error: e6 } = await supabaseAdmin.from('team_invites').delete().eq('email', userEmail)
                    details.push(`team_invites (email): ${e6 ? e6.message : 'ok'}`)
                }

                // 7. UPDATE issues (assignee_id)
                const { error: e7 } = await supabaseAdmin.from('issues').update({ assignee_id: null }).eq('assignee_id', userId)
                details.push(`issues: ${e7 ? e7.message : 'ok'}`)

                // 8. DELETE activity_logs
                const { error: e8 } = await supabaseAdmin.from('activity_logs').delete().eq('user_id', userId)
                details.push(`activity_logs: ${e8 ? e8.message : 'ok'}`)

                // 9. DELETE notifications
                const { error: e9 } = await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
                details.push(`notifications: ${e9 ? e9.message : 'ok'}`)

                // 10. DELETE projects created by user
                const { error: e10 } = await supabaseAdmin.from('projects').delete().eq('created_by', userId)
                details.push(`projects: ${e10 ? e10.message : 'ok'}`)

                // 11. DELETE profiles
                const { error: e11 } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
                details.push(`profiles: ${e11 ? e11.message : 'ok'}`)

                // 12. Finally delete auth user
                console.log('Deleting auth user...')
                const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

                if (authError) {
                    details.push(`auth.users: ${authError.message}`)
                    throw new Error(`Auth: ${authError.message}`)
                }

                details.push('auth.users: ok')
                results.push({ userId, success: true, details })
                console.log(`Deleted user: ${userId}`)

            } catch (userError: any) {
                console.error(`Error deleting ${userId}:`, userError)
                results.push({ userId, success: false, error: userError.message, details })
            }
        }

        const successCount = results.filter(r => r.success).length

        return new Response(
            JSON.stringify({
                success: successCount === user_ids.length,
                message: `Deleted ${successCount}/${user_ids.length} users`,
                results
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
