import React, { useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import './BlockPresence.css';

interface BlockPresenceUser {
    id: string;
    name: string;
    color: string;
    avatar?: string;
    blockId?: string;
}

interface BlockPresenceIndicatorProps {
    editor: Editor | null;
    users: BlockPresenceUser[];
}

/**
 * BlockPresenceIndicator - Shows user avatars next to blocks being edited by collaborators
 * This component overlays avatar indicators on blocks where remote users have their cursor
 */
export function BlockPresenceIndicator({ editor, users }: BlockPresenceIndicatorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [positions, setPositions] = useState<Map<string, { top: number; left: number }>>(new Map());

    useEffect(() => {
        if (!editor || users.length === 0) return;

        const updatePositions = () => {
            const editorElement = editor.view.dom;
            if (!editorElement) return;

            const editorRect = editorElement.getBoundingClientRect();
            const newPositions = new Map<string, { top: number; left: number }>();

            users.forEach((user) => {
                if (!user.blockId) return;

                // Find the block element by blockId attribute
                const blockElement = editorElement.querySelector(`[data-block-id="${user.blockId}"]`);
                if (!blockElement) return;

                const blockRect = blockElement.getBoundingClientRect();
                newPositions.set(user.id, {
                    top: blockRect.top - editorRect.top,
                    left: -32, // Position to the left of the block
                });
            });

            setPositions(newPositions);
        };

        // Update positions on scroll, resize, and editor changes
        updatePositions();

        const observer = new MutationObserver(updatePositions);
        observer.observe(editor.view.dom, {
            childList: true,
            subtree: true,
            attributes: true
        });

        window.addEventListener('scroll', updatePositions, true);
        window.addEventListener('resize', updatePositions);

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', updatePositions, true);
            window.removeEventListener('resize', updatePositions);
        };
    }, [editor, users]);

    if (!editor || users.length === 0) return null;

    return (
        <div ref={containerRef} className="block-presence-container">
            <TooltipProvider>
                {users.map((user) => {
                    const position = positions.get(user.id);
                    if (!position) return null;

                    return (
                        <Tooltip key={user.id}>
                            <TooltipTrigger asChild>
                                <div
                                    className="block-presence-avatar"
                                    style={{
                                        top: position.top,
                                        left: position.left,
                                        borderColor: user.color,
                                    }}
                                >
                                    <Avatar className="h-5 w-5">
                                        {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                                        <AvatarFallback
                                            style={{ backgroundColor: user.color, color: 'white' }}
                                            className="text-[10px] font-medium"
                                        >
                                            {user.name.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">
                                {user.name}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </TooltipProvider>
        </div>
    );
}

export default BlockPresenceIndicator;
