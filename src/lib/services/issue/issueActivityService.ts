import { supabase } from '@/lib/supabase';
import type { Activity, ActivityType, Profile } from '@/types/database';

// ============================================
// ISSUE ACTIVITY SERVICES
// ============================================

export interface ActivityWithUser extends Activity {
    user: Profile | null;
}

export const issueActivityService = {
    async getActivities(issueId: string): Promise<ActivityWithUser[]> {
        const { data: activitiesData, error: activitiesError } = await supabase
            .from('activities')
            .select('*')
            .eq('issue_id', issueId)
            .order('created_at', { ascending: false });

        if (activitiesError) throw activitiesError;
        if (!activitiesData || activitiesData.length === 0) return [];

        const userIds = [...new Set(activitiesData.map(a => a.user_id).filter(Boolean))];

        const { data: profilesData } = userIds.length > 0
            ? await supabase.from('profiles').select('*').in('id', userIds)
            : { data: [] };

        const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

        return activitiesData.map(activity => ({
            ...activity,
            user: activity.user_id ? profilesMap.get(activity.user_id) || null : null,
        })) as unknown as ActivityWithUser[];
    },

    async createActivity(
        issueId: string,
        type: ActivityType,
        activityData: Record<string, unknown>
    ): Promise<Activity> {
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('activities')
            .insert({
                issue_id: issueId,
                user_id: user?.id,
                type,
                data: activityData,
            } as any)
            .select()
            .single();

        if (error) throw error;
        return data as Activity;
    },

    async getTeamActivities(teamId: string, limit = 50): Promise<ActivityWithUser[]> {
        const { data, error } = await supabase
            .from('activities')
            .select(`
        *,
        user:profiles(*),
        issue:issues!inner(team_id, identifier, title)
      `)
            .eq('issue.team_id', teamId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data || []) as unknown as ActivityWithUser[];
    },
};
