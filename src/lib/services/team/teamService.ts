import { supabase } from '@/lib/supabase';
import type { Team } from '@/types/database';

// ============================================
// TEAM SERVICES
// ============================================

export const teamService = {
    async getTeams(): Promise<Team[]> {
        // First get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        // Query teams through team_members to respect RLS
        const { data, error } = await supabase
            .from('team_members')
            .select('team:teams(*)')
            .eq('user_id', user.id)
            .order('joined_at', { ascending: false });

        if (error) {
            console.error('Failed to load teams:', error);
            throw error;
        }

        // Extract teams from the joined result
        const teams = (data || [])
            .map(row => row.team as unknown as Team)
            .filter((team): team is Team => team !== null && typeof team === 'object' && 'id' in team);

        return teams;
    },

    async getTeam(teamId: string): Promise<Team | null> {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .eq('id', teamId)
            .single();

        if (error) throw error;
        return data as Team | null;
    },

    async createTeam(name: string, slug: string, issuePrefix?: string): Promise<Team> {
        // First check for a valid session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Please verify your email first, then try again.');
            }
        }

        // Use RPC function that handles team creation + owner assignment atomically
        const { data: team, error } = await supabase
            .rpc('create_team_with_owner', {
                _name: name,
                _slug: slug,
                _issue_prefix: issuePrefix || slug.toUpperCase().slice(0, 3),
            });

        if (error) {
            console.error('Team creation error:', error);
            throw new Error(error.message || 'Failed to create team');
        }

        if (!team) throw new Error('Failed to create team');

        return team as Team;
    },

    async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team> {
        const { data, error } = await supabase
            .from('teams')
            .update(updates as any)
            .eq('id', teamId)
            .select()
            .single();

        if (error) throw error;
        return data as Team;
    },

    async deleteTeam(teamId: string): Promise<void> {
        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamId);

        if (error) throw error;
    },
};
