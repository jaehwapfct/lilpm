import React from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PresenceAvatarsProps {
  className?: string;
  maxVisible?: number;
}

export function PresenceAvatars({ className, maxVisible = 5 }: PresenceAvatarsProps) {
  const { users, isConnected } = useCollaborationStore();

  if (!isConnected || users.length === 0) {
    return null;
  }

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visibleUsers.map((user, index) => (
        <Tooltip key={user.odId}>
          <TooltipTrigger asChild>
            <div
              className="relative"
              style={{ zIndex: users.length - index }}
            >
              <Avatar 
                className="h-7 w-7 border-2 border-background"
                style={{ borderColor: user.color }}
              >
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback 
                  className="text-xs"
                  style={{ backgroundColor: user.color, color: 'white' }}
                >
                  {user.name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <span 
                className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background"
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{user.name}</p>
            {user.focusedIssueId && (
              <p className="text-xs text-slate-400">
                보고 있는 이슈: {user.focusedIssueId}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      ))}
      
      {remainingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-7 w-7 rounded-full bg-[#121215] border-2 border-background flex items-center justify-center">
              <span className="text-xs font-medium">+{remainingCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{remainingCount}명 더 있음</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
