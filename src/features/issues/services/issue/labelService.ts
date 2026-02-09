import { supabase } from '@/lib/supabase';
import type { Label } from '@/types/database';
import { issueActivityService } from './issueActivityService';

// ============================================
// LABEL SERVICES
// ============================================

export const labelService = {
    async getLabels(teamId: string): Promise<Label[]> {
        const { data, error } = await supabase
            .from('labels')
            .select('*')
            .eq('team_id', teamId)
            .order('name', { ascending: true });

        if (error) throw error;
        return (data || []) as Label[];
    },

    async createLabel(teamId: string, name: string, color: string, description?: string): Promise<Label> {
        const { data, error } = await supabase
            .from('labels')
            .insert({ team_id: teamId, name, color, description } as any)
            .select()
            .single();

        if (error) throw error;
        return data as Label;
    },

    async updateLabel(labelId: string, updates: Partial<Label>): Promise<Label> {
        const { data, error } = await supabase
            .from('labels')
            .update(updates as any)
            .eq('id', labelId)
            .select()
            .single();

        if (error) throw error;
        return data as Label;
    },

    async deleteLabel(labelId: string): Promise<void> {
        const { error } = await supabase
            .from('labels')
            .delete()
            .eq('id', labelId);

        if (error) throw error;
    },

    async addLabelToIssue(issueId: string, labelId: string): Promise<void> {
        const { error } = await supabase
            .from('issue_labels')
            .insert({ issue_id: issueId, label_id: labelId } as any);

        if (error && error.code !== '23505') throw error; // Ignore duplicate

        await issueActivityService.createActivity(issueId, 'label_added', { label_id: labelId });
    },

    async removeLabelFromIssue(issueId: string, labelId: string): Promise<void> {
        const { error } = await supabase
            .from('issue_labels')
            .delete()
            .eq('issue_id', issueId)
            .eq('label_id', labelId);

        if (error) throw error;

        await issueActivityService.createActivity(issueId, 'label_removed', { label_id: labelId });
    },

    async getIssueLabels(issueId: string): Promise<Label[]> {
        const { data, error } = await supabase
            .from('issue_labels')
            .select('label:labels(*)')
            .eq('issue_id', issueId);

        if (error) throw error;
        return (data || []).map(d => (d as any).label as Label);
    },
};
