/**
 * Sidebar Components
 * Reusable navigation and conversation list components
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { MessageSquare, Pin, PinOff, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * NavItem Props
 */
export interface NavItemProps {
    icon: React.ElementType;
    label: string;
    href: string;
    badge?: number;
    isActive?: boolean;
    shortcut?: string;
    onClick?: () => void;
    presenceUsers?: Array<{ odId: string; name: string; avatarUrl?: string; color: string }>;
}

/**
 * NavItem Component
 * Navigation link with icon, badge, and presence indicators
 */
export function NavItem({ icon: Icon, label, href, badge, isActive, shortcut, onClick, presenceUsers = [] }: NavItemProps) {
    return (
        <Link
            to={href}
            onClick={onClick}
            className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors group",
                "hover:bg-accent",
                isActive && "bg-accent text-accent-foreground"
            )}
        >
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
            <span className="flex-1 truncate">{label}</span>

            {/* Presence avatars for users on this page */}
            {presenceUsers.length > 0 && (
                <div className="flex -space-x-1 mr-1">
                    {presenceUsers.slice(0, 2).map((user) => (
                        <div
                            key={user.odId}
                            className="w-4 h-4 rounded-full border border-background flex items-center justify-center text-[8px] font-medium text-white"
                            style={{ backgroundColor: user.color }}
                            title={user.name}
                        >
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                user.name.charAt(0).toUpperCase()
                            )}
                        </div>
                    ))}
                    {presenceUsers.length > 2 && (
                        <div className="w-4 h-4 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] font-medium">
                            +{presenceUsers.length - 2}
                        </div>
                    )}
                </div>
            )}

            {badge !== undefined && badge > 0 && (
                <span className="text-xs bg-primary/20 text-primary px-1.5 rounded-full">{badge}</span>
            )}
        </Link>
    );
}

/**
 * ConversationListItem Props
 */
export interface ConversationListItemProps {
    conv: { id: string; title: string | null; updatedAt: string };
    isPinned: boolean;
    isSelected: boolean;
    isEditing: boolean;
    editingTitle: string;
    dateLocale: typeof ko | typeof enUS;
    t: ReturnType<typeof useTranslation>['t'];
    onSelect: () => void;
    onDelete: () => void;
    onPin: () => void;
    onStartEdit: () => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onEditingTitleChange: (value: string) => void;
}

/**
 * ConversationListItem Component
 * Conversation item for Lily chat mode sidebar
 */
export function ConversationListItem({
    conv,
    isPinned,
    isSelected,
    isEditing,
    editingTitle,
    dateLocale,
    t,
    onSelect,
    onDelete,
    onPin,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onEditingTitleChange,
}: ConversationListItemProps) {
    return (
        <div
            className={cn(
                "group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent",
                isSelected && "bg-accent"
            )}
            onClick={onSelect}
        >
            {isPinned ? (
                <Pin className="h-3 w-3 flex-shrink-0 text-primary" />
            ) : (
                <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            )}

            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => onEditingTitleChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveEdit();
                            if (e.key === 'Escape') onCancelEdit();
                        }}
                        onBlur={onSaveEdit}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm bg-background border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                    />
                ) : (
                    <p className="text-sm truncate">
                        {conv.title || t('lily.untitledConversation', 'Untitled')}
                    </p>
                )}
                <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true, locale: dateLocale })}
                </p>
            </div>

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
                    title={t('common.rename', 'Rename')}
                >
                    <Pencil className="h-3 w-3" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); onPin(); }}
                    title={isPinned ? t('lily.unpin', 'Unpin') : t('lily.pin', 'Pin')}
                >
                    {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    title={t('common.delete', 'Delete')}
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}
