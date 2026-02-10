import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PresenceAvatarsProps {
  className?: string;
  maxVisible?: number;
}

export function PresenceAvatars({ className, maxVisible = 5 }: PresenceAvatarsProps) {
  const navigate = useNavigate();
  const { users, isConnected, followingUserId, followUser, stopFollowing } = useCollaborationStore();

  if (!isConnected || users.length === 0) {
    return null;
  }

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  const handleAvatarClick = (user: typeof users[0]) => {
    if (followingUserId === user.odId) {
      // Already following → stop
      stopFollowing();
      toast.info(`${user.name} 따라가기를 중지했습니다`);
    } else {
      // Start following
      followUser(user.odId);
      toast.success(`${user.name}님을 따라가는 중...`, {
        description: '다시 클릭하면 중지합니다',
        icon: '👁️',
      });

      // If the user is on a different page, navigate there
      if (user.currentPath && window.location.pathname !== user.currentPath) {
        navigate(user.currentPath);
      }
    }
  };

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visibleUsers.map((user, index) => {
        const isFollowing = followingUserId === user.odId;

        return (
          <Tooltip key={user.odId}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleAvatarClick(user)}
                className={cn(
                  "relative focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full transition-all duration-200",
                  isFollowing && "scale-110",
                )}
                style={{ zIndex: users.length - index }}
              >
                <Avatar
                  className={cn(
                    "h-7 w-7 border-2 transition-all duration-200 cursor-pointer",
                    isFollowing
                      ? "border-dashed ring-2 ring-offset-1 ring-offset-background"
                      : "hover:scale-105"
                  )}
                  style={{
                    borderColor: user.color,
                    ...(isFollowing ? { ringColor: user.color } : {}),
                  }}
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
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 border border-background" />
                {/* Following indicator */}
                {isFollowing && (
                  <span
                    className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full flex items-center justify-center border border-background"
                    style={{ backgroundColor: user.color }}
                  >
                    <Eye className="h-2 w-2 text-white" />
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <p className="font-medium">{user.name}</p>
                {user.focusedIssueId && (
                  <p className="text-xs text-slate-400">
                    보고 있는 이슈: {user.focusedIssueId}
                  </p>
                )}
                {user.currentPath && (
                  <p className="text-xs text-slate-400">
                    {user.currentPath}
                  </p>
                )}
                <p className="text-[10px] text-slate-500 mt-1">
                  {isFollowing ? '클릭하여 따라가기 중지' : '클릭하여 따라가기'}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}

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
