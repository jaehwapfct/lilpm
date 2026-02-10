import React, { useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripVertical,
    Pin,
    PinOff,
    MessageSquare,
    Pencil,
    Trash2,
    Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConversationItemProps {
    conv: { id: string; title: string | null; updatedAt: string };
    isPinned: boolean;
    isSelected: boolean;
    isEditing: boolean;
    editingTitle: string;
    dateLocale: Locale;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    t: (key: string, defaultValue?: any) => string;
    onSelect: () => void;
    onDelete: () => void;
    onPin: () => void;
    onShare?: () => void;
    onStartEdit: () => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onEditingTitleChange: (value: string) => void;
    isDraggable?: boolean;
}

export function ConversationItem({
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
    onShare,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onEditingTitleChange,
    isDraggable = true,
}: ConversationItemProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: conv.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center gap-2 p-2 rounded-xl cursor-pointer hover:bg-white/5",
                isSelected && "bg-violet-500/10",
                isDragging && "z-50"
            )}
            onClick={onSelect}
        >
            {isDraggable && (
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab opacity-0 group-hover:opacity-100 hover:bg-[#1a1a1f] rounded p-0.5"
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical className="h-3 w-3 text-slate-400" />
                </div>
            )}
            {isPinned && <Pin className="h-3 w-3 flex-shrink-0 text-violet-500" />}
            {!isPinned && !isDraggable && <MessageSquare className="h-4 w-4 flex-shrink-0 text-slate-400" />}

            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => onEditingTitleChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveEdit();
                            if (e.key === 'Escape') onCancelEdit();
                        }}
                        onBlur={onSaveEdit}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-sm bg-[#121215] border border-white/10 rounded-lg px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                ) : (
                    <p className="text-sm truncate">
                        {conv.title || t('lily.untitledConversation', 'Untitled')}
                    </p>
                )}
                <p className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true, locale: dateLocale })}
                </p>
            </div>

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                        e.stopPropagation();
                        onStartEdit();
                    }}
                    title={t('common.rename', 'Rename')}
                >
                    <Pencil className="h-3 w-3" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                        e.stopPropagation();
                        onPin();
                    }}
                    title={isPinned ? t('lily.unpin', 'Unpin') : t('lily.pin', 'Pin')}
                >
                    {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </Button>
                {onShare && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                            e.stopPropagation();
                            onShare();
                        }}
                        title={t('lily.share', 'Share')}
                    >
                        <Share2 className="h-3 w-3" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    title={t('common.delete', 'Delete')}
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}
