import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, createAdminClient, jsonResponse, errorResponse } from '../_shared/mod.ts';

const FUNCTION_VERSION = '2026-02-10.1'; // Refactored to use shared modules + parallel operations

/**
 * Delete a single table's records for a user
 * Returns a description of the operation result
 */
async function deleteFromTable(
  supabase: any,
  table: string,
  column: string,
  userId: string,
  operation: 'delete' | 'nullify' = 'delete'
): Promise<string> {
  try {
    if (operation === 'nullify') {
      const { error } = await supabase.from(table).update({ [column]: null }).eq(column, userId);
      return `${table} (${column}): ${error ? error.message : 'ok'}`;
    }
    const { error } = await supabase.from(table).delete().eq(column, userId);
    return `${table} (${column}): ${error ? error.message : 'ok'}`;
  } catch (e: any) {
    return `${table} (${column}): ${e.message}`;
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { user_ids } = await req.json();

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      throw new Error('user_ids array is required');
    }

    const supabaseAdmin = createAdminClient();
    const results: { userId: string; success: boolean; error?: string; details?: string[] }[] = [];

    for (const userId of user_ids) {
      try {
        console.log(`[${FUNCTION_VERSION}] Starting deletion for user: ${userId}`);

        // Get user email
        let userEmail = '';
        try {
          const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
          userEmail = userData?.user?.email || '';
        } catch (e: any) {
          console.warn(`Could not get user email: ${e.message}`);
        }

        // Phase 1: Parallel cleanup of independent tables
        const phase1Results = await Promise.all([
          deleteFromTable(supabaseAdmin, 'user_ai_settings', 'user_id', userId),
          deleteFromTable(supabaseAdmin, 'activity_logs', 'user_id', userId),
          deleteFromTable(supabaseAdmin, 'notifications', 'user_id', userId),
          deleteFromTable(supabaseAdmin, 'conversation_access_requests', 'requested_by', userId),
          deleteFromTable(supabaseAdmin, 'conversation_access_requests', 'reviewed_by', userId, 'nullify'),
          deleteFromTable(supabaseAdmin, 'conversation_shares', 'shared_by', userId),
          deleteFromTable(supabaseAdmin, 'team_invites', 'invited_by', userId, 'nullify'),
          deleteFromTable(supabaseAdmin, 'issues', 'assignee_id', userId, 'nullify'),
          deleteFromTable(supabaseAdmin, 'issues', 'creator_id', userId, 'nullify'),
        ]);

        // Phase 2: Tables with dependencies (must be sequential)
        const phase2Results: string[] = [];

        // Delete PRD data
        const prdDocResult = await deleteFromTable(supabaseAdmin, 'prd_documents', 'created_by', userId);
        phase2Results.push(prdDocResult);
        const prdProjectResult = await deleteFromTable(supabaseAdmin, 'prd_projects', 'created_by', userId);
        phase2Results.push(prdProjectResult);

        // Delete conversations (cascades to messages)
        const convResult = await deleteFromTable(supabaseAdmin, 'conversations', 'user_id', userId);
        phase2Results.push(convResult);

        // Delete team-related data
        const teamMemberResult = await deleteFromTable(supabaseAdmin, 'team_members', 'user_id', userId);
        phase2Results.push(teamMemberResult);

        // Delete team invites by email
        if (userEmail) {
          const inviteResult = await deleteFromTable(supabaseAdmin, 'team_invites', 'email', userEmail);
          phase2Results.push(inviteResult);
        }

        // Phase 3: Delete profile, then auth user
        const profileResult = await deleteFromTable(supabaseAdmin, 'profiles', 'id', userId);
        phase2Results.push(profileResult);

        // Finally delete auth user
        console.log('Deleting auth user...');
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
          throw new Error(`Auth: ${authError.message}`);
        }

        const details = [
          `User: ${userEmail || userId}`,
          ...phase1Results,
          ...phase2Results,
          'auth.users: ok',
        ];

        results.push({ userId, success: true, details });
        console.log(`[${FUNCTION_VERSION}] Deleted user: ${userId}`);
      } catch (userError: any) {
        console.error(`Error deleting ${userId}:`, userError);
        results.push({ userId, success: false, error: userError.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return jsonResponse({
      success: successCount === user_ids.length,
      message: `Deleted ${successCount}/${user_ids.length} users`,
      results,
      version: FUNCTION_VERSION,
    });
  } catch (error: any) {
    return errorResponse(error.message, 400);
  }
});
