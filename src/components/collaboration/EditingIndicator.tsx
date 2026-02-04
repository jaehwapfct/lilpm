import React from 'react';
import { useCollaborationStore, type Presence } from '@/stores/collaborationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EditingIndicatorProps {
  issueId: string;
  className?: string;
}

/**
 * Notion-style block editing presence indicator
 * Shows user avatars on the left side of a block when someone is editing
 */
interface BlockEditingPresenceProps {
  blockId: string;  // Unique identifier for the block/field being edited
  className?: string;
}

export function BlockEditingPresence({ blockId, className }: BlockEditingPresenceProps) {
  const { users, myPresence } = useCollaborationStore();
  
  // Filter users editing this specific block
  const editingUsers = users.filter(
    (u) => u.focusedIssueId === blockId && u.isEditing
  );
  
  if (editingUsers.length === 0) return null;

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      {editingUsers.map((user) => (
        <Tooltip key={user.odId}>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="relative"
            >
              <Avatar className="h-5 w-5 ring-2 ring-background shadow-sm">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                ) : (
                  <AvatarFallback 
                    className="text-[9px] font-medium text-white"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
              {/* Colored indicator dot */}
              <span 
                className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-background animate-pulse"
                style={{ backgroundColor: user.color }}
              />
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p className="text-xs font-medium">{user.name}</p>
            <p className="text-[10px] text-muted-foreground">Editing</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/**
 * Horizontal presence avatars for inline editing (Google Docs style)
 * Shows multiple users with colored borders
 */
interface InlineEditingPresenceProps {
  fieldId: string;
  className?: string;
}

export function InlineEditingPresence({ fieldId, className }: InlineEditingPresenceProps) {
  const { users } = useCollaborationStore();
  
  const editingUsers = users.filter(
    (u) => u.focusedIssueId === fieldId && u.isEditing
  );
  
  if (editingUsers.length === 0) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1 ${className}`}
    >
      <div className="flex -space-x-1.5">
        {editingUsers.slice(0, 3).map((user) => (
          <Tooltip key={user.odId}>
            <TooltipTrigger asChild>
              <Avatar 
                className="h-5 w-5 ring-2" 
                style={{ '--ring-color': user.color } as React.CSSProperties}
              >
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                ) : (
                  <AvatarFallback 
                    className="text-[9px] font-medium text-white"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{user.name} is editing</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {editingUsers.length > 3 && (
          <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium ring-2 ring-background">
            +{editingUsers.length - 3}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Shows who is currently editing a specific issue
 */
export function EditingIndicator({ issueId, className }: EditingIndicatorProps) {
  const { users } = useCollaborationStore();
  const { t } = useTranslation();
  
  const editingUsers = users.filter(
    (u) => u.focusedIssueId === issueId && u.isEditing
  );
  
  if (editingUsers.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 ${className}`}
      >
        <Pencil className="h-3 w-3 text-amber-500 animate-pulse" />
        <span className="text-xs text-amber-600 dark:text-amber-400">
          {editingUsers.length === 1 
            ? t('collaboration.userEditing', { name: editingUsers[0].name })
            : t('collaboration.usersEditing', { count: editingUsers.length })
          }
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Shows a typing indicator when someone is typing in comments
 */
export function TypingIndicator({ issueId }: { issueId: string }) {
  const { users } = useCollaborationStore();
  const { t } = useTranslation();
  
  const typingUsers = users.filter(
    (u) => u.focusedIssueId === issueId && u.isTyping
  );
  
  if (typingUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="flex items-center gap-2 text-xs text-muted-foreground"
    >
      <div className="flex gap-0.5">
        <motion.span
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
        />
        <motion.span
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
        />
        <motion.span
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
        />
      </div>
      <span>
        {typingUsers.length === 1
          ? t('collaboration.userTyping', { name: typingUsers[0].name })
          : t('collaboration.usersTyping', { count: typingUsers.length })
        }
      </span>
    </motion.div>
  );
}
