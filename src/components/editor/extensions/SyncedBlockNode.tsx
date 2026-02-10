/**
 * SyncedBlock Node Extension
 * 
 * A visual wrapper node that renders synced blocks with Notion-style
 * red border and sync indicators.
 * 
 * This is the visual Node component. The SyncedBlock Extension (SyncedBlock.ts)
 * handles the data/command layer.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect } from 'react';
import { RefreshCw, Unlink, Copy, ArrowUpRight } from 'lucide-react';

const SyncedBlockComponent: React.FC<NodeViewProps> = ({
    node,
    updateAttributes,
    selected,
    deleteNode,
    editor,
}) => {
    const { syncedBlockId, isOriginal, label } = node.attrs;
    const [isSyncing, setIsSyncing] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const handleUnlink = () => {
        // Remove the synced block wrapper but keep the content
        const pos = editor.state.selection.from;
        // Get the content inside the synced block
        const content = node.content.toJSON();
        
        // Delete the synced block node and insert its contents
        deleteNode();
        if (content && content.length > 0) {
            editor.chain().focus().insertContent(content).run();
        }
    };

    const handleCopyRef = () => {
        if (syncedBlockId) {
            navigator.clipboard.writeText(syncedBlockId);
        }
    };

    const handleRefresh = () => {
        setIsSyncing(true);
        // Simulate sync delay
        setTimeout(() => setIsSyncing(false), 1000);
    };

    return (
        <NodeViewWrapper>
            <div
                className={`relative my-4 rounded-lg border-2 transition-colors ${
                    selected
                        ? 'border-red-400 ring-2 ring-red-400/20'
                        : 'border-red-400/30 hover:border-red-400/60'
                }`}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                {/* Synced block header */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/5 border-b border-red-400/20">
                    <RefreshCw className={`h-3 w-3 text-red-400 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="text-xs font-medium text-red-400">
                        {isOriginal ? 'Synced block' : 'Synced reference'}
                    </span>
                    {syncedBlockId && (
                        <span className="text-[10px] text-red-400/50 font-mono">
                            {syncedBlockId.slice(0, 8)}...
                        </span>
                    )}

                    {/* Actions */}
                    {showActions && (
                        <div className="ml-auto flex items-center gap-0.5">
                            <button
                                onClick={handleRefresh}
                                className="p-1 hover:bg-red-400/10 rounded text-red-400"
                                title="Refresh synced content"
                            >
                                <RefreshCw className="h-3 w-3" />
                            </button>
                            <button
                                onClick={handleCopyRef}
                                className="p-1 hover:bg-red-400/10 rounded text-red-400"
                                title="Copy sync ID"
                            >
                                <Copy className="h-3 w-3" />
                            </button>
                            <button
                                onClick={handleUnlink}
                                className="p-1 hover:bg-red-400/10 rounded text-red-400"
                                title="Unlink synced block"
                            >
                                <Unlink className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Content area - editable */}
                <div className="p-3 min-h-[40px]">
                    <NodeViewContent className="synced-block-content" />
                </div>

                {/* Non-original indicator */}
                {!isOriginal && (
                    <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[10px] text-red-400/40">
                        <ArrowUpRight className="h-2.5 w-2.5" />
                        Reference
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};

export const SyncedBlockNode = Node.create({
    name: 'syncedBlockNode',

    group: 'block',

    content: 'block+',

    defining: true,

    addAttributes() {
        return {
            syncedBlockId: {
                default: null,
                parseHTML: element => element.getAttribute('data-synced-block-id'),
                renderHTML: attributes => {
                    if (!attributes.syncedBlockId) return {};
                    return { 'data-synced-block-id': attributes.syncedBlockId };
                },
            },
            isOriginal: {
                default: true,
                parseHTML: element => element.getAttribute('data-is-original') === 'true',
                renderHTML: attributes => ({
                    'data-is-original': String(attributes.isOriginal),
                }),
            },
            label: {
                default: 'Synced block',
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-type="synced-block"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes({ 'data-type': 'synced-block' }, HTMLAttributes), 0];
    },

    addNodeView() {
        return ReactNodeViewRenderer(SyncedBlockComponent);
    },
});

export default SyncedBlockNode;
