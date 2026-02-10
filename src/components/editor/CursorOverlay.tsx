/**
 * CursorOverlay Component
 * 
 * Renders remote cursors as smooth-animated DOM overlays on top of the editor.
 * Uses perfect-cursors library for natural interpolation between position updates.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PerfectCursor } from 'perfect-cursors';
import type { Editor } from '@tiptap/core';
import type { RemoteCursor } from '@/hooks/useCloudflareCollaboration';

interface CursorOverlayProps {
    editor: Editor | null;
    cursors: Map<string, RemoteCursor>;
}

interface SmoothCursorState {
    userId: string;
    name: string;
    color: string;
    top: number;
    left: number;
}

/**
 * Single smooth cursor - uses PerfectCursor for interpolation
 */
function SmoothCursor({ userId, name, color, targetTop, targetLeft }: {
    userId: string;
    name: string;
    color: string;
    targetTop: number;
    targetLeft: number;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const pcRef = useRef<PerfectCursor | null>(null);

    // Initialize PerfectCursor
    useEffect(() => {
        if (!ref.current) return;

        const pc = new PerfectCursor((point: number[]) => {
            if (ref.current) {
                ref.current.style.transform = `translate(${point[0]}px, ${point[1]}px)`;
            }
        });

        pcRef.current = pc;

        return () => {
            pc.dispose();
            pcRef.current = null;
        };
    }, []);

    // Feed new positions to PerfectCursor
    useEffect(() => {
        pcRef.current?.addPoint([targetLeft, targetTop]);
    }, [targetTop, targetLeft]);

    return (
        <div
            ref={ref}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translate(${targetLeft}px, ${targetTop}px)`,
                pointerEvents: 'none',
                zIndex: 50,
            }}
        >
            {/* Cursor caret */}
            <div
                style={{
                    width: '2px',
                    height: '20px',
                    backgroundColor: color,
                    borderRadius: '1px',
                    boxShadow: `0 0 4px ${color}40`,
                }}
            />
            {/* Name label */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '-1px',
                    backgroundColor: color,
                    color: 'white',
                    padding: '1px 6px 2px',
                    borderRadius: '3px 3px 3px 0',
                    fontSize: '11px',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    lineHeight: '16px',
                }}
            >
                {name}
            </div>
        </div>
    );
}

export function CursorOverlay({ editor, cursors }: CursorOverlayProps) {
    const [cursorPositions, setCursorPositions] = useState<Map<string, { top: number; left: number; name: string; color: string }>>(new Map());

    const computePositions = useCallback(() => {
        if (!editor || !cursors || cursors.size === 0) {
            setCursorPositions(new Map());
            return;
        }

        const newPositions = new Map<string, { top: number; left: number; name: string; color: string }>();

        cursors.forEach((cursor) => {
            try {
                const docSize = editor.state.doc.content.size;
                const pos = Math.min(Math.max(0, cursor.position), docSize);
                const coords = editor.view.coordsAtPos(pos);
                const editorRect = editor.view.dom.getBoundingClientRect();

                newPositions.set(cursor.odId, {
                    top: coords.top - editorRect.top,
                    left: coords.left - editorRect.left,
                    name: cursor.name,
                    color: cursor.color,
                });
            } catch {
                // Position out of bounds, skip
            }
        });

        setCursorPositions(newPositions);
    }, [editor, cursors]);

    useEffect(() => {
        if (!editor) return;

        computePositions();

        const handleUpdate = () => requestAnimationFrame(computePositions);
        editor.on('transaction', handleUpdate);
        editor.on('selectionUpdate', handleUpdate);

        // Update on scroll
        const interval = setInterval(computePositions, 1000);

        return () => {
            editor.off('transaction', handleUpdate);
            editor.off('selectionUpdate', handleUpdate);
            clearInterval(interval);
        };
    }, [editor, computePositions]);

    if (!editor || cursorPositions.size === 0) return null;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 50 }}>
            {Array.from(cursorPositions.entries()).map(([userId, pos]) => (
                <SmoothCursor
                    key={userId}
                    userId={userId}
                    name={pos.name}
                    color={pos.color}
                    targetTop={pos.top}
                    targetLeft={pos.left}
                />
            ))}
        </div>
    );
}
