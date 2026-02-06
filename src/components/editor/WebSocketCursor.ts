/**
 * WebSocket-based Cursor Extension
 * 
 * Displays remote cursors received via Cloudflare WebSocket.
 * Unlike CollaborationCursor (Supabase), this receives cursor data as props.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { RemoteCursor } from '@/hooks/useCloudflareCollaboration';

const webSocketCursorPluginKey = new PluginKey('webSocketCursor');

export interface WebSocketCursorOptions {
    cursors: Map<string, RemoteCursor>;
    onSelectionChange?: (position: number) => void;
}

export const WebSocketCursor = Extension.create<WebSocketCursorOptions>({
    name: 'webSocketCursor',

    addOptions() {
        return {
            cursors: new Map(),
            onSelectionChange: undefined,
        };
    },

    addProseMirrorPlugins() {
        const { cursors, onSelectionChange } = this.options;

        return [
            new Plugin({
                key: webSocketCursorPluginKey,

                state: {
                    init: () => DecorationSet.empty,

                    apply: (tr, oldState, _oldEditorState, newEditorState) => {
                        const decorations: Decoration[] = [];

                        cursors.forEach((cursor) => {
                            // Check if cursor position is valid
                            if (cursor.position < 0 || cursor.position > newEditorState.doc.content.size) {
                                return;
                            }

                            // Create cursor widget
                            const widget = document.createElement('span');
                            widget.className = 'ws-collaboration-cursor';
                            widget.style.cssText = `
                                position: relative;
                                border-left: 2px solid ${cursor.color};
                                margin-left: -1px;
                                margin-right: -1px;
                                pointer-events: none;
                            `;

                            // Name label
                            const label = document.createElement('span');
                            label.className = 'ws-collaboration-cursor-label';
                            label.textContent = cursor.name;
                            label.style.cssText = `
                                position: absolute;
                                bottom: 100%;
                                left: -1px;
                                background: ${cursor.color};
                                color: white;
                                padding: 2px 6px;
                                border-radius: 3px 3px 3px 0;
                                font-size: 11px;
                                font-weight: 500;
                                white-space: nowrap;
                                z-index: 100;
                                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                            `;
                            widget.appendChild(label);

                            // Blinking caret
                            const caret = document.createElement('span');
                            caret.className = 'ws-collaboration-cursor-caret';
                            caret.style.cssText = `
                                display: inline-block;
                                width: 2px;
                                height: 1.2em;
                                background: ${cursor.color};
                                animation: wsCursorBlink 1s step-end infinite;
                                margin-left: -1px;
                            `;
                            widget.appendChild(caret);

                            decorations.push(
                                Decoration.widget(cursor.position, widget, {
                                    side: 0,
                                    key: cursor.odId,
                                })
                            );
                        });

                        return DecorationSet.create(newEditorState.doc, decorations);
                    },
                },

                props: {
                    decorations(state) {
                        return this.getState(state);
                    },
                },

                view: (view) => {
                    // Report cursor position on selection change
                    const handleSelectionChange = () => {
                        onSelectionChange?.(view.state.selection.from);
                    };

                    // Debounce
                    let timeout: number | null = null;
                    const debouncedReport = () => {
                        if (timeout) clearTimeout(timeout);
                        timeout = window.setTimeout(handleSelectionChange, 50);
                    };

                    return {
                        update: debouncedReport,
                        destroy: () => {
                            if (timeout) clearTimeout(timeout);
                        },
                    };
                },
            }),
        ];
    },
});

// CSS for cursor animations
export const webSocketCursorStyles = `
    @keyframes wsCursorBlink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
    }
`;
