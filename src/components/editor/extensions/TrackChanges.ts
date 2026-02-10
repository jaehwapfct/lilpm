/**
 * TrackChanges Extension
 * 
 * Tracks who last edited each block in the document.
 * Displays a colored left border indicating the author of each change.
 * Shows author name on hover via tooltip.
 * 
 * How it works:
 * - Each top-level block gets a `lastEditedBy` attribute (userId)
 * - When a user modifies a block, their userId/name/color is recorded
 * - ProseMirror decorations render colored borders on the left side
 * - Hovering over the border shows "Edited by [name]"
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface TrackChangesUser {
    id: string;
    name: string;
    color: string;
}

export interface TrackChangesOptions {
    /** Whether track changes is enabled */
    enabled: boolean;
    /** Current user info */
    currentUser: TrackChangesUser | null;
    /** Map of userId → user info for display */
    users: Map<string, TrackChangesUser>;
}

interface BlockEditInfo {
    userId: string;
    userName: string;
    color: string;
    timestamp: number;
}

const trackChangesPluginKey = new PluginKey('trackChanges');

export const TrackChangesExtension = Extension.create<TrackChangesOptions>({
    name: 'trackChanges',

    addOptions() {
        return {
            enabled: false,
            currentUser: null,
            users: new Map(),
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: [
                    'paragraph', 'heading', 'bulletList', 'orderedList',
                    'taskList', 'blockquote', 'codeBlock', 'table',
                    'callout', 'toggle', 'horizontalRule',
                ],
                attributes: {
                    lastEditedBy: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('data-last-edited-by'),
                        renderHTML: (attributes) => {
                            if (!attributes.lastEditedBy) return {};
                            return { 'data-last-edited-by': attributes.lastEditedBy };
                        },
                    },
                    lastEditedByName: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('data-last-edited-by-name'),
                        renderHTML: (attributes) => {
                            if (!attributes.lastEditedByName) return {};
                            return { 'data-last-edited-by-name': attributes.lastEditedByName };
                        },
                    },
                    lastEditedByColor: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('data-last-edited-by-color'),
                        renderHTML: (attributes) => {
                            if (!attributes.lastEditedByColor) return {};
                            return { 'data-last-edited-by-color': attributes.lastEditedByColor };
                        },
                    },
                },
            },
        ];
    },

    addProseMirrorPlugins() {
        const extensionOptions = this.options;

        return [
            new Plugin({
                key: trackChangesPluginKey,

                // Track which blocks were modified in each transaction
                appendTransaction(transactions, oldState, newState) {
                    if (!extensionOptions.enabled || !extensionOptions.currentUser) return null;

                    // Check if any transaction has doc changes
                    const hasDocChanges = transactions.some(tr => tr.docChanged);
                    if (!hasDocChanges) return null;

                    const { id, name, color } = extensionOptions.currentUser;
                    const tr = newState.tr;
                    let modified = false;

                    // Find blocks that were modified
                    transactions.forEach(transaction => {
                        if (!transaction.docChanged) return;

                        transaction.steps.forEach((step) => {
                            const stepMap = step.getMap();
                            stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
                                // Find the top-level block(s) that contain the changed range
                                newState.doc.nodesBetween(newStart, Math.min(newEnd, newState.doc.content.size), (node, pos, parent) => {
                                    // Only process top-level blocks (direct children of doc)
                                    if (parent !== newState.doc) return false;
                                    if (!node.type.isBlock) return false;

                                    // Skip if already attributed to this user recently
                                    if (node.attrs.lastEditedBy === id) return false;

                                    // Mark this block as edited by current user
                                    tr.setNodeMarkup(pos, undefined, {
                                        ...node.attrs,
                                        lastEditedBy: id,
                                        lastEditedByName: name,
                                        lastEditedByColor: color,
                                    });
                                    modified = true;
                                    return false; // Don't recurse into children
                                });
                            });
                        });
                    });

                    return modified ? tr : null;
                },

                props: {
                    decorations(state) {
                        if (!extensionOptions.enabled) return DecorationSet.empty;

                        const decorations: Decoration[] = [];

                        state.doc.forEach((node, offset) => {
                            const userId = node.attrs.lastEditedBy;
                            const userName = node.attrs.lastEditedByName;
                            const userColor = node.attrs.lastEditedByColor;

                            if (userId && userColor) {
                                // Left border decoration showing who edited this block
                                decorations.push(
                                    Decoration.node(offset, offset + node.nodeSize, {
                                        class: 'track-changes-block',
                                        style: `border-left: 3px solid ${userColor}; padding-left: 8px; margin-left: -11px; position: relative;`,
                                        'data-track-user': userName || userId,
                                        title: `Edited by ${userName || 'Unknown'}`,
                                    })
                                );
                            }
                        });

                        return DecorationSet.create(state.doc, decorations);
                    },
                },
            }),
        ];
    },
});
