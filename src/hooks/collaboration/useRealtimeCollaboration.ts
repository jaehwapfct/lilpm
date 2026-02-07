import { useEffect, useRef, useCallback } from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useAuthStore } from '@/stores/authStore';
import { useTeamStore } from '@/stores/teamStore';

interface UseRealtimeCollaborationOptions {
  enabled?: boolean;
}

/**
 * Hook to manage real-time collaboration in a team context
 * Automatically connects/disconnects when team changes
 */
export function useRealtimeCollaboration(options: UseRealtimeCollaborationOptions = {}) {
  const { enabled = true } = options;
  const containerRef = useRef<HTMLElement>(null);
  
  const { user } = useAuthStore();
  const { currentTeam } = useTeamStore();
  const {
    isConnected,
    users,
    myPresence,
    joinRoom,
    leaveRoom,
    updateCursor,
    setFocusedIssue,
    setIsEditing,
    setIsTyping,
    broadcastIssueUpdate,
  } = useCollaborationStore();

  // Connect to collaboration room when team changes
  useEffect(() => {
    if (!enabled || !user || !currentTeam) {
      return;
    }

    const roomId = `team:${currentTeam.id}`;
    
    joinRoom(roomId, {
      id: user.id,
      name: user.name || user.email,
      avatarUrl: user.avatarUrl,
    });

    return () => {
      leaveRoom();
    };
  }, [enabled, user?.id, currentTeam?.id]);

  // Track cursor position
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isConnected) return;
    
    updateCursor({ x: e.clientX, y: e.clientY });
  }, [isConnected, updateCursor]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (!isConnected) return;
    
    updateCursor({ x: -100, y: -100 });
  }, [isConnected, updateCursor]);

  // Set up cursor tracking on container
  useEffect(() => {
    if (!enabled || !isConnected) return;
    
    const container = containerRef.current || document.body;
    
    // Throttle cursor updates
    let lastUpdate = 0;
    const throttledMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdate > 50) { // Max 20 updates per second
        lastUpdate = now;
        handleMouseMove(e);
      }
    };

    container.addEventListener('mousemove', throttledMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', throttledMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [enabled, isConnected, handleMouseMove, handleMouseLeave]);

  return {
    containerRef,
    isConnected,
    users,
    myPresence,
    setFocusedIssue,
    setIsEditing,
    setIsTyping,
    broadcastIssueUpdate,
    onlineCount: users.length + (isConnected ? 1 : 0),
  };
}

/**
 * Hook to track when a user focuses on a specific issue
 */
export function useIssueFocus(issueId: string | null) {
  const { setFocusedIssue, users } = useCollaborationStore();

  useEffect(() => {
    setFocusedIssue(issueId);
    
    return () => {
      setFocusedIssue(null);
    };
  }, [issueId, setFocusedIssue]);

  // Get users focusing on this issue
  const focusedUsers = users.filter((u) => u.focusedIssueId === issueId);

  return { focusedUsers };
}

/**
 * Hook to listen for real-time issue updates
 */
export function useRealtimeIssueUpdates(
  onUpdate: (issueId: string, changes: Record<string, unknown>, updatedBy: string) => void
) {
  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const { issueId, changes, updatedBy } = event.detail;
      onUpdate(issueId, changes, updatedBy);
    };

    window.addEventListener('realtime:issue:update', handler as EventListener);
    
    return () => {
      window.removeEventListener('realtime:issue:update', handler as EventListener);
    };
  }, [onUpdate]);
}
