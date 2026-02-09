import { supabase } from '@/lib/supabase';
import type { Issue } from '@/types/database';

export interface IssueTemplate {
    id: string;
    team_id: string;
    name: string;
    description: string | null;
    icon: string;
    default_title: string | null;
    default_description: string | null;
    default_status: string;
    default_priority: string;
    default_labels: string[];
    default_estimate: number | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

export type CreateTemplateInput = Omit<IssueTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>;
export type UpdateTemplateInput = Partial<CreateTemplateInput>;

export const issueTemplateService = {
    /**
     * Get all templates for a team
     */
    async getTemplates(teamId: string): Promise<IssueTemplate[]> {
        const { data, error } = await supabase
            .from('issue_templates')
            .select('*')
            .eq('team_id', teamId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Get a single template by ID
     */
    async getTemplate(templateId: string): Promise<IssueTemplate | null> {
        const { data, error } = await supabase
            .from('issue_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create a new template
     */
    async createTemplate(template: CreateTemplateInput): Promise<IssueTemplate> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('issue_templates')
            .insert({
                ...template,
                created_by: user?.id,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update a template
     */
    async updateTemplate(templateId: string, updates: UpdateTemplateInput): Promise<IssueTemplate> {
        const { data, error } = await supabase
            .from('issue_templates')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', templateId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a template (soft delete by deactivating)
     */
    async deleteTemplate(templateId: string): Promise<void> {
        const { error } = await supabase
            .from('issue_templates')
            .update({ is_active: false })
            .eq('id', templateId);

        if (error) throw error;
    },

    /**
     * Apply a template to create issue defaults
     */
    applyTemplate(template: IssueTemplate): { title: string; description: string; status: string; priority: string; estimate?: number } {
        return {
            title: template.default_title || '',
            description: template.default_description || '',
            status: template.default_status,
            priority: template.default_priority,
            estimate: template.default_estimate || undefined,
        };
    },

    /**
     * Get built-in template suggestions (for teams without templates)
     */
    getBuiltInTemplates(): Omit<IssueTemplate, 'id' | 'team_id' | 'created_at' | 'updated_at' | 'created_by'>[] {
        return [
            {
                name: 'Bug Report',
                description: 'Report a bug or issue',
                icon: '🐛',
                default_title: '[Bug] ',
                default_description: '## Description\nDescribe the bug\n\n## Steps to Reproduce\n1. \n2. \n\n## Expected Behavior\n\n## Actual Behavior\n',
                default_status: 'backlog',
                default_priority: 'high',
                default_labels: ['bug'],
                default_estimate: null,
                is_active: true,
                sort_order: 0,
            },
            {
                name: 'Feature Request',
                description: 'Request a new feature',
                icon: '✨',
                default_title: '[Feature] ',
                default_description: '## Feature Description\n\n## Use Case\n\n## Acceptance Criteria\n- [ ] \n- [ ] \n',
                default_status: 'backlog',
                default_priority: 'medium',
                default_labels: ['feature'],
                default_estimate: null,
                is_active: true,
                sort_order: 1,
            },
            {
                name: 'Task',
                description: 'General task or todo item',
                icon: '📝',
                default_title: '',
                default_description: '## Task Description\n\n## Checklist\n- [ ] \n',
                default_status: 'todo',
                default_priority: 'none',
                default_labels: [],
                default_estimate: null,
                is_active: true,
                sort_order: 2,
            },
            {
                name: 'User Story',
                description: 'User story format',
                icon: '👤',
                default_title: '[Story] ',
                default_description: '## User Story\n**As a** [user type]\n**I want** [action]\n**So that** [benefit]\n\n## Acceptance Criteria\n- [ ] \n- [ ] \n',
                default_status: 'backlog',
                default_priority: 'medium',
                default_labels: ['story'],
                default_estimate: null,
                is_active: true,
                sort_order: 3,
            },
        ];
    },
};
