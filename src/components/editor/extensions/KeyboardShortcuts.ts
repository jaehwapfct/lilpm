/**
 * Keyboard Shortcuts Extension
 * 
 * Notion-style keyboard shortcuts for block type conversion:
 * - Cmd/Ctrl+Shift+0: Text (paragraph)
 * - Cmd/Ctrl+Shift+1: Heading 1
 * - Cmd/Ctrl+Shift+2: Heading 2
 * - Cmd/Ctrl+Shift+3: Heading 3
 * - Cmd/Ctrl+Shift+4: To-do checkbox
 * - Cmd/Ctrl+Shift+5: Bullet list
 * - Cmd/Ctrl+Shift+6: Numbered list
 * - Cmd/Ctrl+Shift+7: Toggle list
 * - Cmd/Ctrl+Shift+8: Code block
 * - Cmd/Ctrl+Shift+9: New page / callout
 */

import { Extension } from '@tiptap/core';

export const KeyboardShortcuts = Extension.create({
    name: 'notionKeyboardShortcuts',

    addKeyboardShortcuts() {
        return {
            // Cmd/Ctrl + Option/Shift + 0: Text (paragraph)
            'Mod-Shift-0': () => {
                return this.editor.chain().focus().setParagraph().run();
            },

            // Cmd/Ctrl + Option/Shift + 1: Heading 1
            'Mod-Shift-1': () => {
                return this.editor.chain().focus().toggleHeading({ level: 1 }).run();
            },

            // Cmd/Ctrl + Option/Shift + 2: Heading 2
            'Mod-Shift-2': () => {
                return this.editor.chain().focus().toggleHeading({ level: 2 }).run();
            },

            // Cmd/Ctrl + Option/Shift + 3: Heading 3
            'Mod-Shift-3': () => {
                return this.editor.chain().focus().toggleHeading({ level: 3 }).run();
            },

            // Cmd/Ctrl + Option/Shift + 4: To-do checkbox
            'Mod-Shift-4': () => {
                return this.editor.chain().focus().toggleTaskList().run();
            },

            // Cmd/Ctrl + Option/Shift + 5: Bullet list
            'Mod-Shift-5': () => {
                return this.editor.chain().focus().toggleBulletList().run();
            },

            // Cmd/Ctrl + Option/Shift + 6: Numbered list
            'Mod-Shift-6': () => {
                return this.editor.chain().focus().toggleOrderedList().run();
            },

            // Cmd/Ctrl + Option/Shift + 7: Toggle list
            'Mod-Shift-7': () => {
                return this.editor.chain().focus().insertContent({
                    type: 'toggle',
                    content: [{ type: 'paragraph' }],
                }).run();
            },

            // Cmd/Ctrl + Option/Shift + 8: Code block
            'Mod-Shift-8': () => {
                return this.editor.chain().focus().toggleCodeBlock().run();
            },

            // Cmd/Ctrl + Option/Shift + 9: Callout
            'Mod-Shift-9': () => {
                return this.editor.chain().focus().insertContent({
                    type: 'callout',
                    attrs: { type: 'info' },
                    content: [{ type: 'paragraph' }],
                }).run();
            },

            // Cmd/Ctrl + Shift + H: Apply last used color/highlight
            'Mod-Shift-h': () => {
                return this.editor.chain().focus().toggleHighlight().run();
            },

            // Cmd/Ctrl + D: Duplicate current block
            'Mod-d': () => {
                const { $from } = this.editor.state.selection;
                try {
                    const blockStart = $from.before($from.depth);
                    const blockEnd = $from.after($from.depth);
                    const blockSlice = this.editor.state.doc.slice(blockStart, blockEnd);
                    const blockJSON = blockSlice.content.toJSON();
                    this.editor.chain().focus().insertContentAt(blockEnd, blockJSON).run();
                    return true;
                } catch {
                    return false;
                }
            },

            // Cmd/Ctrl + Shift + Up: Move block up
            'Mod-Shift-ArrowUp': () => {
                // TipTap doesn't have built-in block move, but we can implement it
                const { $from } = this.editor.state.selection;
                try {
                    const blockStart = $from.before($from.depth);
                    if (blockStart <= 1) return false; // Already at top

                    const $blockStart = this.editor.state.doc.resolve(blockStart);
                    const prevBlockEnd = $blockStart.before();
                    const prevBlockStart = this.editor.state.doc.resolve(prevBlockEnd).before($from.depth);

                    // Swap the two blocks by cutting current and inserting before previous
                    const blockEnd = $from.after($from.depth);
                    const currentBlock = this.editor.state.doc.slice(blockStart, blockEnd);
                    const currentBlockJSON = currentBlock.content.toJSON();

                    this.editor.chain()
                        .focus()
                        .deleteRange({ from: blockStart, to: blockEnd })
                        .insertContentAt(prevBlockStart, currentBlockJSON)
                        .run();

                    return true;
                } catch {
                    return false;
                }
            },

            // Cmd/Ctrl + Shift + Down: Move block down
            'Mod-Shift-ArrowDown': () => {
                const { $from } = this.editor.state.selection;
                try {
                    const blockEnd = $from.after($from.depth);
                    const docSize = this.editor.state.doc.content.size;
                    if (blockEnd >= docSize - 1) return false; // Already at bottom

                    const blockStart = $from.before($from.depth);
                    const $blockEnd = this.editor.state.doc.resolve(blockEnd);
                    const nextBlockEnd = $blockEnd.after($from.depth);

                    // Cut current block and insert after next block
                    const currentBlock = this.editor.state.doc.slice(blockStart, blockEnd);
                    const currentBlockJSON = currentBlock.content.toJSON();

                    this.editor.chain()
                        .focus()
                        .deleteRange({ from: blockStart, to: blockEnd })
                        .insertContentAt(nextBlockEnd - (blockEnd - blockStart), currentBlockJSON)
                        .run();

                    return true;
                } catch {
                    return false;
                }
            },
        };
    },
});

export default KeyboardShortcuts;
