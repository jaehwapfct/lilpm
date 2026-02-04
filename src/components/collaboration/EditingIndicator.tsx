import React from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';

interface EditingIndicatorProps {
  issueId: string;
  className?: string;
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
