import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';

/**
 * Hook to subscribe to realtime team member changes.
 * When a member is added or removed from the current team,
 * the members list is automatically refreshed.
 */
export function useTeamMemberRealtime() {
    const { currentTeam, loadMembers, loadTeams } = useTeamStore();
    const { user } = useAuthStore();

    useEffect(() => {
        if (!currentTeam?.id) return;

        // Subscribe to team_members changes for the current team
        const channel = supabase
            .channel(`team_members:${currentTeam.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'team_members',
                    filter: `team_id=eq.${currentTeam.id}`,
                },
                (payload) => {
                    console.log('[Realtime] Team member change:', payload);

                    // Reload members when any change happens
                    loadMembers(currentTeam.id);

                    // If the deleted member is the current user, reload teams
                    if (payload.eventType === 'DELETE' && payload.old?.user_id === user?.id) {
                        console.log('[Realtime] Current user was removed from team');
                        loadTeams();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentTeam?.id, loadMembers, loadTeams, user?.id]);
}

/**
 * Hook to subscribe to user's team membership changes.
 * When the user is added to or removed from any team,
 * the teams list is automatically refreshed.
 */
export function useUserTeamsRealtime() {
    const { loadTeams } = useTeamStore();
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user?.id) return;

        // Subscribe to all team_members changes for this user
        const channel = supabase
            .channel(`user_teams:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'team_members',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[Realtime] User team membership change:', payload);
                    loadTeams();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, loadTeams]);
}
