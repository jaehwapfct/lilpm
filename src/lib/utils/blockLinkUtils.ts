import type { Editor } from '@tiptap/react';
import { getBlockIdAtPos, findBlockById } from '@/components/editor/extensions/UniqueId';
import { toast } from 'sonner';

/**
 * Utilities for block-level deep linking
 * Enables copying shareable links to specific blocks and scrolling to them
 */

export interface BlockLinkOptions {
    /** Base URL for the document (e.g., /prd/123 or /issue/456) */
    baseUrl: string;
    /** The TipTap editor instance */
    editor: Editor;
}

/**
 * Generate a deep link URL for a specific block
 */
export function generateBlockLink(blockId: string, baseUrl: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${baseUrl}#block-${blockId}`;
}

/**
 * Copy block link to clipboard with toast notification
 */
export async function copyBlockLink(blockId: string, baseUrl: string): Promise<void> {
    const link = generateBlockLink(blockId, baseUrl);

    try {
        await navigator.clipboard.writeText(link);
        toast.success('Block link copied!', {
            description: 'Share this link to jump directly to this block.',
        });
    } catch (error) {
        console.error('Failed to copy block link:', error);
        toast.error('Failed to copy link');
    }
}

/**
 * Get block ID at current cursor position
 */
export function getBlockIdAtCursor(editor: Editor): string | null {
    const { selection } = editor.state;
    return getBlockIdAtPos(editor.state, selection.from);
}

/**
 * Scroll to a specific block by ID
 */
export function scrollToBlock(editor: Editor, blockId: string): boolean {
    const pos = findBlockById(editor.state.doc, blockId);

    if (pos === null) {
        console.warn(`[BlockLink] Block not found: ${blockId}`);
        return false;
    }

    // Focus the editor at this position
    editor.chain().focus().setTextSelection(pos).run();

    // Scroll the block into view
    const editorElement = editor.view.dom;
    const blockElement = editorElement.querySelector(`[data-block-id="${blockId}"]`);

    if (blockElement) {
        blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Add temporary highlight effect
        blockElement.classList.add('block-link-highlight');
        setTimeout(() => {
            blockElement.classList.remove('block-link-highlight');
        }, 2000);

        return true;
    }

    return false;
}

/**
 * Parse block ID from URL hash (e.g., #block-abc123)
 */
export function parseBlockIdFromHash(hash: string): string | null {
    if (!hash || !hash.startsWith('#block-')) {
        return null;
    }
    return hash.replace('#block-', '');
}

/**
 * Hook-like function to handle block link on page load
 * Call this in useEffect to scroll to linked block
 */
export function handleBlockLinkNavigation(editor: Editor): void {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const blockId = parseBlockIdFromHash(hash);

    if (blockId) {
        // Small delay to ensure document is loaded
        setTimeout(() => {
            const success = scrollToBlock(editor, blockId);
            if (!success) {
                toast.error('Block not found', {
                    description: 'The linked block may have been deleted.',
                });
            }
        }, 500);
    }
}

export default {
    generateBlockLink,
    copyBlockLink,
    getBlockIdAtCursor,
    scrollToBlock,
    parseBlockIdFromHash,
    handleBlockLinkNavigation,
};
