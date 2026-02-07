import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { user_ids } = await req.json()

        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            throw new Error('user_ids array is required')
        }

        // Create admin client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const results: { userId: string; success: boolean; error?: string }[] = []

        for (const userId of user_ids) {
            try {
                console.log(`Deleting user: ${userId}`)

                // Step 1: Delete from team_members (this cascades due to FK)
                const { error: teamMembersError } = await supabaseAdmin
                    .from('team_members')
                    .delete()
                    .eq('user_id', userId)

                if (teamMembersError) {
                    console.log(`team_members delete warning: ${teamMembersError.message}`)
                }

                // Step 2: Delete from team_invites where user is invitee
                const { error: invitesError } = await supabaseAdmin
                    .from('team_invites')
                    .delete()
                    .eq('email', await getEmailForUser(supabaseAdmin, userId))

                if (invitesError) {
                    console.log(`team_invites delete warning: ${invitesError.message}`)
                }

                // Step 3: Update issues to remove assignee
                const { error: issuesError } = await supabaseAdmin
                    .from('issues')
                    .update({ assignee_id: null })
                    .eq('assignee_id', userId)

                if (issuesError) {
                    console.log(`issues update warning: ${issuesError.message}`)
                }

                // Step 4: Delete activity logs
                const { error: logsError } = await supabaseAdmin
                    .from('activity_logs')
                    .delete()
                    .eq('user_id', userId)

                if (logsError) {
                    console.log(`activity_logs delete warning: ${logsError.message}`)
                }

                // Step 5: Delete notifications
                const { error: notifError } = await supabaseAdmin
                    .from('notifications')
                    .delete()
                    .eq('user_id', userId)

                if (notifError) {
                    console.log(`notifications delete warning: ${notifError.message}`)
                }

                // Step 6: Delete profile (this should cascade from auth.users but we do it explicitly)
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .delete()
                    .eq('id', userId)

                if (profileError) {
                    console.log(`profiles delete warning: ${profileError.message}`)
                }

                // Step 7: Finally, delete the auth user
                const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

                if (authError) {
                    throw authError
                }

                results.push({ userId, success: true })
                console.log(`Successfully deleted user: ${userId}`)

            } catch (userError: any) {
                console.error(`Error deleting user ${userId}:`, userError)
                results.push({
                    userId,
                    success: false,
                    error: userError.message || 'Unknown error'
                })
            }
        }

        const allSuccess = results.every(r => r.success)
        const successCount = results.filter(r => r.success).length

        return new Response(
            JSON.stringify({
                success: allSuccess,
                message: `Deleted ${successCount}/${user_ids.length} users`,
                results
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: allSuccess ? 200 : 207 // 207 Multi-Status if partial success
            }
        )

    } catch (error: any) {
        console.error('Delete users error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})

// Helper function to get user email
async function getEmailForUser(supabase: any, userId: string): Promise<string> {
    try {
        const { data } = await supabase.auth.admin.getUserById(userId)
        return data?.user?.email || ''
    } catch {
        return ''
    }
}
