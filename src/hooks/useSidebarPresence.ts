import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useTeamStore } from '@/stores/teamStore';
import { useCollaborationStore, Presence } from '@/stores/collaborationStore';

/**
 * Hook to track and broadcast user's current sidebar menu position
 * Shows team member avatars next to sidebar menu items in real-time
 */
export function useSidebarPresence() {
    const location = useLocation();
    const { user } = useAuthStore();
    const { currentTeam } = useTeamStore();
    const { setSidebarPresenceUsers } = useCollaborationStore();
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const presenceUsersRef = useRef<Map<string, Presence>>(new Map());

    // Generate consistent color for user
    const getUserColor = useCallback((userId: string): string => {
        const colors = [
            '#F87171', '#FB923C', '#FBBF24', '#4ADE80', '#22D3EE',
            '#60A5FA', '#A78BFA', '#F472B6', '#94A3B8'
        ];
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash) + userId.charCodeAt(i);
        }
        return colors[Math.abs(hash) % colors.length];
    }, []);

    useEffect(() => {
        if (!user || !currentTeam) return;

        const channelName = `sidebar-presence:${currentTeam.id}`;

        // Create channel for sidebar presence
        const channel = supabase.channel(channelName, {
            config: { presence: { key: user.id } }
        });

        channelRef.current = channel;

        // Handle presence sync
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users: Presence[] = [];

            Object.entries(state).forEach(([userId, presences]) => {
                if (userId !== user.id && presences.length > 0) {
                    const presence = presences[0] as Record<string, unknown>;
                    const presenceData: Presence = {
                        odId: presence.id as string,
                        name: presence.name as string,
                        avatarUrl: presence.avatarUrl as string | undefined,
                        color: presence.color as string,
                        currentPath: presence.currentPath as string,
                    };
                    users.push(presenceData);
                    presenceUsersRef.current.set(userId, presenceData);
                }
            });

            // Update collaboration store with sidebar presence users (separate from room users)
            setSidebarPresenceUsers(users);
        });

        // Handle user join
        channel.on('presence', { event: 'join' }, ({ newPresences }) => {
            newPresences.forEach((presence) => {
                const data = presence as Record<string, unknown>;
                if (data.id !== user.id) {
                    const presenceData: Presence = {
                        odId: data.id as string,
                        name: data.name as string,
                        avatarUrl: data.avatarUrl as string | undefined,
                        color: data.color as string,
                        currentPath: data.currentPath as string,
                    };
                    presenceUsersRef.current.set(data.id as string, presenceData);
                }
            });
        });

        // Handle user leave
        channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
            leftPresences.forEach((presence) => {
                const data = presence as Record<string, unknown>;
                presenceUsersRef.current.delete(data.id as string);
            });
        });

        // Subscribe and track presence
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    id: user.id,
                    name: user.name || user.email,
                    avatarUrl: user.avatarUrl,
                    color: getUserColor(user.id),
                    currentPath: location.pathname,
                    lastSeen: Date.now(),
                });
            }
        });

        return () => {
            channel.unsubscribe();
            channelRef.current = null;
        };
    }, [user?.id, currentTeam?.id, setSidebarPresenceUsers, getUserColor, location.pathname]);

    // Update presence when path changes
    useEffect(() => {
        if (!channelRef.current || !user) return;

        channelRef.current.track({
            id: user.id,
            name: user.name || user.email,
            avatarUrl: user.avatarUrl,
            color: getUserColor(user.id),
            currentPath: location.pathname,
            lastSeen: Date.now(),
        });
    }, [location.pathname, user, getUserColor]);

    // Get presence users for a specific path
    const getPresenceForPath = useCallback((path: string): Presence[] => {
        const users: Presence[] = [];
        presenceUsersRef.current.forEach((presence) => {
            // Match path exactly or as prefix
            if (presence.currentPath === path || presence.currentPath?.startsWith(path + '/')) {
                users.push(presence);
            }
        });
        return users;
    }, []);

    return {
        getPresenceForPath,
        presenceUsers: Array.from(presenceUsersRef.current.values()),
    };
}
