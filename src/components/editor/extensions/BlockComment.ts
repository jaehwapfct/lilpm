import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * BlockComment Extension
 * Enables commenting on specific blocks within the editor
 */

export interface BlockComment {
    id: string;
    blockId: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: string;
    updatedAt: string;
    resolved: boolean;
    replies: BlockCommentReply[];
}

export interface BlockCommentReply {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: string;
}

export interface BlockCommentOptions {
    /** All comments for the current document */
    comments: BlockComment[];
    /** Current user info */
    currentUser: {
        id: string;
        name: string;
        avatar?: string;
    };
    /** Callback when a comment is added */
    onCommentAdd?: (blockId: string, content: string) => Promise<void>;
    /** Callback when a comment is resolved */
    onCommentResolve?: (commentId: string) => Promise<void>;
    /** Callback when a reply is added */
    onReplyAdd?: (commentId: string, content: string) => Promise<void>;
    /** Callback when comment indicator is clicked */
    onCommentClick?: (blockId: string, comments: BlockComment[]) => void;
}

const blockCommentPluginKey = new PluginKey('blockComment');

export const BlockCommentExtension = Extension.create<BlockCommentOptions>({
    name: 'blockComment',

    addOptions() {
        return {
            comments: [],
            currentUser: { id: '', name: 'Anonymous' },
            onCommentAdd: undefined,
            onCommentResolve: undefined,
            onReplyAdd: undefined,
            onCommentClick: undefined,
        };
    },

    addProseMirrorPlugins() {
        const { comments, onCommentClick } = this.options;

        return [
            new Plugin({
                key: blockCommentPluginKey,
                props: {
                    decorations: (state) => {
                        const decorations: Decoration[] = [];
                        const commentsByBlock = new Map<string, BlockComment[]>();

                        // Group comments by blockId
                        comments.forEach((comment) => {
                            if (!comment.resolved) {
                                const existing = commentsByBlock.get(comment.blockId) || [];
                                existing.push(comment);
                                commentsByBlock.set(comment.blockId, existing);
                            }
                        });

                        // Find blocks with comments and add decorations
                        state.doc.descendants((node, pos) => {
                            const blockId = node.attrs?.blockId;
                            if (blockId && commentsByBlock.has(blockId)) {
                                const blockComments = commentsByBlock.get(blockId)!;
                                const commentCount = blockComments.length;

                                // Add a widget decoration for the comment indicator
                                decorations.push(
                                    Decoration.widget(pos, () => {
                                        const indicator = document.createElement('button');
                                        indicator.className = 'block-comment-indicator';
                                        indicator.innerHTML = `
                      <span class="comment-count">${commentCount}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                    `;
                                        indicator.title = `${commentCount} comment${commentCount > 1 ? 's' : ''}`;
                                        indicator.onclick = (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            onCommentClick?.(blockId, blockComments);
                                        };
                                        return indicator;
                                    }, { side: -1 })
                                );

                                // Add inline decoration to highlight commented block
                                decorations.push(
                                    Decoration.node(pos, pos + node.nodeSize, {
                                        class: 'has-comment',
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

    addKeyboardShortcuts() {
        return {
            'Mod-Shift-m': () => {
                // Open comment dialog for current block
                const { selection } = this.editor.state;
                const $pos = this.editor.state.doc.resolve(selection.from);

                for (let depth = $pos.depth; depth >= 0; depth--) {
                    const node = $pos.node(depth);
                    if (node.attrs?.blockId) {
                        const blockId = node.attrs.blockId;
                        this.options.onCommentClick?.(blockId,
                            this.options.comments.filter(c => c.blockId === blockId && !c.resolved)
                        );
                        return true;
                    }
                }
                return false;
            },
        };
    },
});

export default BlockCommentExtension;
