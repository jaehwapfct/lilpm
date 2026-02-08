import { Extension } from '@tiptap/core';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

/**
 * SyncedBlock Extension
 * 
 * Enables Notion-style synced blocks that are shared across multiple pages.
 * When content is edited in one location, it updates everywhere.
 * 
 * Data Structure:
 * - syncedBlockId: UUID shared across all instances
 * - sourceDocumentId: Original document where the block was created
 * - isOriginal: true for the source block, false for references
 */

export interface SyncedBlockOptions {
    /**
     * Callback when a synced block is updated
     * Use this to propagate changes to other documents
     */
    onSyncedBlockUpdate?: (syncedBlockId: string, content: any) => void;

    /**
     * Callback when a synced block needs to fetch latest content
     */
    onSyncedBlockFetch?: (syncedBlockId: string) => Promise<any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        syncedBlock: {
            /**
             * Create a new synced block from selected content
             */
            createSyncedBlock: () => ReturnType;
            /**
             * Insert a reference to an existing synced block
             */
            insertSyncedBlockRef: (syncedBlockId: string) => ReturnType;
            /**
             * Unlink a synced block (convert to regular content)
             */
            unlinkSyncedBlock: () => ReturnType;
        };
    }
}

export const SyncedBlock = Extension.create<SyncedBlockOptions>({
    name: 'syncedBlock',

    addOptions() {
        return {
            onSyncedBlockUpdate: undefined,
            onSyncedBlockFetch: undefined,
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'callout', 'toggle'],
                attributes: {
                    syncedBlockId: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('data-synced-block-id'),
                        renderHTML: (attributes) => {
                            if (!attributes.syncedBlockId) return {};
                            return {
                                'data-synced-block-id': attributes.syncedBlockId,
                                class: 'synced-block',
                            };
                        },
                    },
                    sourceDocumentId: {
                        default: null,
                        parseHTML: (element) => element.getAttribute('data-source-document-id'),
                        renderHTML: (attributes) => {
                            if (!attributes.sourceDocumentId) return {};
                            return { 'data-source-document-id': attributes.sourceDocumentId };
                        },
                    },
                    isOriginal: {
                        default: true,
                        parseHTML: (element) => element.getAttribute('data-is-original') === 'true',
                        renderHTML: (attributes) => {
                            return { 'data-is-original': String(attributes.isOriginal) };
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            createSyncedBlock:
                () =>
                    ({ state, chain }) => {
                        const { from, to } = state.selection;
                        const syncedBlockId = crypto.randomUUID();

                        // Get current document ID from URL or context
                        const sourceDocumentId = typeof window !== 'undefined'
                            ? window.location.pathname.split('/').pop() || 'unknown'
                            : 'unknown';

                        // For each block in selection, add synced block attributes
                        state.doc.nodesBetween(from, to, (node, pos) => {
                            if (node.isBlock && !node.isText) {
                                chain().updateAttributes(node.type.name, {
                                    syncedBlockId,
                                    sourceDocumentId,
                                    isOriginal: true,
                                });
                            }
                        });

                        return true;
                    },

            insertSyncedBlockRef:
                (syncedBlockId: string) =>
                    ({ chain }) => {
                        // Insert a placeholder that will be filled with synced content
                        return chain()
                            .insertContent({
                                type: 'paragraph',
                                attrs: {
                                    syncedBlockId,
                                    isOriginal: false,
                                },
                                content: [{ type: 'text', text: 'Loading synced content...' }],
                            })
                            .run();
                    },

            unlinkSyncedBlock:
                () =>
                    ({ state, chain }) => {
                        const { from, to } = state.selection;

                        state.doc.nodesBetween(from, to, (node, pos) => {
                            if (node.attrs?.syncedBlockId) {
                                chain().updateAttributes(node.type.name, {
                                    syncedBlockId: null,
                                    sourceDocumentId: null,
                                    isOriginal: true,
                                });
                            }
                        });

                        return true;
                    },
        };
    },
});

/**
 * Service for managing synced blocks across documents
 */
export class SyncedBlockService {
    private supabase: any;

    constructor(supabaseClient: any) {
        this.supabase = supabaseClient;
    }

    /**
     * Save synced block content to database
     */
    async saveSyncedBlock(syncedBlockId: string, content: any, sourceDocumentId: string): Promise<void> {
        await this.supabase
            .from('synced_blocks')
            .upsert({
                id: syncedBlockId,
                content: JSON.stringify(content),
                source_document_id: sourceDocumentId,
                updated_at: new Date().toISOString(),
            });
    }

    /**
     * Fetch synced block content from database
     */
    async fetchSyncedBlock(syncedBlockId: string): Promise<any | null> {
        const { data, error } = await this.supabase
            .from('synced_blocks')
            .select('content')
            .eq('id', syncedBlockId)
            .single();

        if (error || !data) {
            console.error('[SyncedBlock] Failed to fetch:', error);
            return null;
        }

        return JSON.parse(data.content);
    }

    /**
     * Subscribe to real-time updates for a synced block
     */
    subscribeToSyncedBlock(syncedBlockId: string, onUpdate: (content: any) => void): () => void {
        const channel = this.supabase
            .channel(`synced-block-${syncedBlockId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'synced_blocks', filter: `id=eq.${syncedBlockId}` },
                (payload: any) => {
                    onUpdate(JSON.parse(payload.new.content));
                }
            )
            .subscribe();

        return () => {
            this.supabase.removeChannel(channel);
        };
    }
}

export default SyncedBlock;
