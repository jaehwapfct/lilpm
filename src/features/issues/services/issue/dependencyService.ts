import { supabase } from '@/lib/supabase';

// ============================================
// DEPENDENCY SERVICES
// ============================================

export const dependencyService = {
    async getDependencies(teamId: string) {
        const { data, error } = await supabase
            .from('issue_dependencies')
            .select(`
        *,
        source_issue:issues!source_issue_id!inner(id, team_id),
        target_issue:issues!target_issue_id(id, team_id)
      `)
            .eq('source_issue.team_id', teamId);

        if (error) throw error;
        return data || [];
    },

    async createDependency(sourceIssueId: string, targetIssueId: string) {
        const { data, error } = await supabase
            .from('issue_dependencies')
            .insert({
                source_issue_id: sourceIssueId,
                target_issue_id: targetIssueId,
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteDependency(sourceIssueId: string, targetIssueId: string) {
        const { error } = await supabase
            .from('issue_dependencies')
            .delete()
            .eq('source_issue_id', sourceIssueId)
            .eq('target_issue_id', targetIssueId);

        if (error) throw error;
    }
};
