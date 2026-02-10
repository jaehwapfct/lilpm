import React from 'react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Users, Eye, Pencil, Circle } from 'lucide-react';

interface OnlineUsersPanelProps {
  trigger?: React.ReactNode;
}

export function OnlineUsersPanel({ trigger }: OnlineUsersPanelProps) {
  const { users, isConnected, myPresence } = useCollaborationStore();
  const { t } = useTranslation();

  if (!isConnected) return null;

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Users className="h-4 w-4" />
      <span>{users.length + 1} {t('collaboration.online')}</span>
    </Button>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('collaboration.onlineUsers')}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Current user */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-400 uppercase">
              {t('collaboration.you')}
            </p>
            <UserItem
              name={myPresence.name || t('common.you')}
              avatarUrl={myPresence.avatarUrl}
              color={myPresence.color || '#6366f1'}
              isCurrentUser
            />
          </div>

          {/* Other users */}
          {users.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase">
                {t('collaboration.teamMembers')}
              </p>
              <AnimatePresence>
                {users.map((user) => (
                  <motion.div
                    key={user.odId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <UserItem
                      name={user.name}
                      avatarUrl={user.avatarUrl}
                      color={user.color}
                      focusedIssueId={user.focusedIssueId}
                      isEditing={user.isEditing}
                      isTyping={user.isTyping}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {users.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t('collaboration.noOtherUsers')}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface UserItemProps {
  name: string;
  avatarUrl?: string;
  color: string;
  focusedIssueId?: string;
  isEditing?: boolean;
  isTyping?: boolean;
  isCurrentUser?: boolean;
}

function UserItem({ 
  name, 
  avatarUrl, 
  color, 
  focusedIssueId, 
  isEditing, 
  isTyping,
  isCurrentUser 
}: UserItemProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
      <div className="relative">
        <Avatar className="h-9 w-9 border-2" style={{ borderColor: color }}>
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback style={{ backgroundColor: color, color: 'white' }}>
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span 
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background"
          style={{ backgroundColor: '#22c55e' }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{name}</span>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {t('collaboration.you')}
            </Badge>
          )}
        </div>
        
        {focusedIssueId && (
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
            {isEditing ? (
              <>
                <Pencil className="h-3 w-3 text-amber-500" />
                <span>{t('collaboration.editing')}</span>
              </>
            ) : isTyping ? (
              <>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Circle className="h-2 w-2 fill-current text-green-500" />
                </motion.div>
                <span>{t('collaboration.typing')}</span>
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                <span>{t('collaboration.viewing')}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
