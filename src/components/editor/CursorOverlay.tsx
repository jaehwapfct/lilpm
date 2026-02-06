/**
 * CursorOverlay Component
 * 
 * Renders remote cursors as DOM overlays on top of the editor.
 * This approach bypasses Tiptap extension limitations.
 */

import React, { useEffect, useState, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import type { RemoteCursor } from '@/hooks/useCloudflareCollaboration';

interface CursorOverlayProps {
    editor: Editor | null;
    cursors: Map<string, RemoteCursor>;
}

interface CursorPosition {
    userId: string;
    name: string;
    color: string;
    top: number;
    left: number;
    visible: boolean;
}

export function CursorOverlay({ editor, cursors }: CursorOverlayProps) {
    const [positions, setPositions] = useState<CursorPosition[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!editor || !cursors || cursors.size === 0) {
            setPositions([]);
            return;
        }

        const updatePositions = () => {
            const newPositions: CursorPosition[] = [];

            cursors.forEach((cursor) => {
                try {
                    // Validate position is within document bounds
                    const docSize = editor.state.doc.content.size;
                    const pos = Math.min(Math.max(0, cursor.position), docSize);

                    // Get DOM coordinates for this position
                    const coords = editor.view.coordsAtPos(pos);

                    // Get editor container bounds
                    const editorRect = editor.view.dom.getBoundingClientRect();

                    // Calculate relative position
                    const top = coords.top - editorRect.top;
                    const left = coords.left - editorRect.left;

                    // Check if cursor is visible
                    const visible = (
                        coords.top >= editorRect.top &&
                        coords.bottom <= editorRect.bottom &&
                        coords.left >= editorRect.left &&
                        coords.right <= editorRect.right
                    );

                    console.log(`[CursorOverlay] Cursor ${cursor.name} at pos ${pos}: top=${top.toFixed(0)}, left=${left.toFixed(0)}, visible=${visible}`);

                    newPositions.push({
                        userId: cursor.odId,
                        name: cursor.name,
                        color: cursor.color,
                        top,
                        left,
                        visible: true, // Always show for now
                    });
                } catch (e) {
                    console.error('[CursorOverlay] Error calculating position:', e);
                }
            });

            setPositions(newPositions);
        };

        // Update immediately
        updatePositions();

        // Update on editor changes
        const handleUpdate = () => {
            requestAnimationFrame(updatePositions);
        };

        editor.on('transaction', handleUpdate);
        editor.on('selectionUpdate', handleUpdate);

        // Also update periodically for scroll changes
        const interval = setInterval(updatePositions, 500);

        return () => {
            editor.off('transaction', handleUpdate);
            editor.off('selectionUpdate', handleUpdate);
            clearInterval(interval);
        };
    }, [editor, cursors]);

    if (!editor || positions.length === 0) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 50,
            }}
        >
            {positions.map((pos) => (
                <div
                    key={pos.userId}
                    style={{
                        position: 'absolute',
                        top: pos.top,
                        left: pos.left,
                        transition: 'top 0.1s, left 0.1s',
                    }}
                >
                    {/* Cursor line */}
                    <div
                        style={{
                            width: '2px',
                            height: '20px',
                            backgroundColor: pos.color,
                            animation: 'cursorBlink 1s step-end infinite',
                        }}
                    />
                    {/* Name label */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '-1px',
                            backgroundColor: pos.color,
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '3px 3px 3px 0',
                            fontSize: '11px',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                    >
                        {pos.name}
                    </div>
                </div>
            ))}
            <style>{`
                @keyframes cursorBlink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}
