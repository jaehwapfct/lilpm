/**
 * DragHandleMenu Extension
 * 
 * Adds a context menu when clicking the drag handle (⠿).
 * Provides quick actions: Turn into, Color, Duplicate, Delete.
 * 
 * Works alongside the existing GlobalDragHandle extension.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import {
    Type, Heading1, Heading2, Heading3, List, ListOrdered, ListTodo,
    Quote, Code, Copy, Trash2, Palette, ChevronRight, Info,
} from 'lucide-react';

// Block types for "Turn into"
const TURN_INTO_OPTIONS = [
    { name: 'Text', icon: Type, action: (editor: any) => editor.chain().focus().setParagraph().run() },
    { name: 'Heading 1', icon: Heading1, action: (editor: any) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { name: 'Heading 2', icon: Heading2, action: (editor: any) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { name: 'Heading 3', icon: Heading3, action: (editor: any) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { name: 'Bullet List', icon: List, action: (editor: any) => editor.chain().focus().toggleBulletList().run() },
    { name: 'Numbered List', icon: ListOrdered, action: (editor: any) => editor.chain().focus().toggleOrderedList().run() },
    { name: 'To-do', icon: ListTodo, action: (editor: any) => editor.chain().focus().toggleTaskList().run() },
    { name: 'Quote', icon: Quote, action: (editor: any) => editor.chain().focus().toggleBlockquote().run() },
    { name: 'Code Block', icon: Code, action: (editor: any) => editor.chain().focus().toggleCodeBlock().run() },
    { name: 'Callout', icon: Info, action: (editor: any) => editor.chain().focus().insertContent({ type: 'callout', attrs: { type: 'info' }, content: [{ type: 'paragraph' }] }).run() },
];

const TEXT_COLORS = [
    { name: 'Default', color: null },
    { name: 'Red', color: '#EF4444' },
    { name: 'Orange', color: '#F97316' },
    { name: 'Yellow', color: '#EAB308' },
    { name: 'Green', color: '#22C55E' },
    { name: 'Blue', color: '#3B82F6' },
    { name: 'Purple', color: '#A855F7' },
    { name: 'Gray', color: '#6B7280' },
];

const BG_COLORS = [
    { name: 'None', color: null },
    { name: 'Red', color: '#FEE2E2' },
    { name: 'Yellow', color: '#FEF3C7' },
    { name: 'Green', color: '#DCFCE7' },
    { name: 'Blue', color: '#DBEAFE' },
    { name: 'Purple', color: '#F3E8FF' },
];

// Menu Component
function DragHandleMenuComponent({
    editor,
    onClose,
}: {
    editor: any;
    onClose: () => void;
}) {
    const [showTurnInto, setShowTurnInto] = React.useState(false);
    const [showColor, setShowColor] = React.useState(false);

    const handleDuplicate = () => {
        const { $from } = editor.state.selection;
        try {
            const blockStart = $from.before($from.depth);
            const blockEnd = $from.after($from.depth);
            const blockSlice = editor.state.doc.slice(blockStart, blockEnd);
            editor.chain().focus().insertContentAt(blockEnd, blockSlice.content.toJSON()).run();
        } catch { /* ignore */ }
        onClose();
    };

    const handleDelete = () => {
        const { $from } = editor.state.selection;
        try {
            const blockStart = $from.before($from.depth);
            const blockEnd = $from.after($from.depth);
            editor.chain().focus().deleteRange({ from: blockStart, to: blockEnd }).run();
        } catch { /* ignore */ }
        onClose();
    };

    return (
        <div className="bg-[#1a1a1f] border border-white/10 rounded-lg shadow-lg w-[220px] overflow-hidden">
            {!showTurnInto && !showColor && (
                <>
                    <button
                        onClick={() => setShowTurnInto(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 text-left"
                    >
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                        <span>Turn into</span>
                        <ChevronRight className="h-3 w-3 text-slate-400 ml-auto" />
                    </button>
                    <button
                        onClick={() => setShowColor(true)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 text-left"
                    >
                        <Palette className="h-4 w-4 text-slate-400" />
                        <span>Color</span>
                        <ChevronRight className="h-3 w-3 text-slate-400 ml-auto" />
                    </button>
                    <div className="h-px bg-white/10 mx-2" />
                    <button
                        onClick={handleDuplicate}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 text-left"
                    >
                        <Copy className="h-4 w-4 text-slate-400" />
                        <span>Duplicate</span>
                        <span className="text-[10px] text-slate-400 ml-auto">⌘D</span>
                    </button>
                    <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 text-left text-red-400"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                        <span className="text-[10px] ml-auto">⌫</span>
                    </button>
                </>
            )}

            {showTurnInto && (
                <>
                    <button
                        onClick={() => setShowTurnInto(false)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5"
                    >
                        ← Back
                    </button>
                    <div className="h-px bg-white/10" />
                    {TURN_INTO_OPTIONS.map(opt => {
                        const Icon = opt.icon;
                        return (
                            <button
                                key={opt.name}
                                onClick={() => { opt.action(editor); onClose(); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/5 text-left"
                            >
                                <Icon className="h-4 w-4 text-slate-400" />
                                <span>{opt.name}</span>
                            </button>
                        );
                    })}
                </>
            )}

            {showColor && (
                <>
                    <button
                        onClick={() => setShowColor(false)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5"
                    >
                        ← Back
                    </button>
                    <div className="h-px bg-white/10" />
                    <div className="px-3 py-1 text-[10px] text-slate-400 font-semibold">Text color</div>
                    <div className="flex gap-1 px-3 pb-2">
                        {TEXT_COLORS.map(c => (
                            <button
                                key={c.name}
                                onClick={() => {
                                    if (c.color) editor.chain().focus().setColor(c.color).run();
                                    else editor.chain().focus().unsetColor().run();
                                    onClose();
                                }}
                                className="w-6 h-6 rounded border border-white/10 hover:scale-110 transition-transform"
                                style={{ backgroundColor: c.color || 'transparent' }}
                                title={c.name}
                            />
                        ))}
                    </div>
                    <div className="px-3 py-1 text-[10px] text-slate-400 font-semibold">Background</div>
                    <div className="flex gap-1 px-3 pb-2">
                        {BG_COLORS.map(c => (
                            <button
                                key={c.name}
                                onClick={() => {
                                    if (c.color) editor.chain().focus().toggleHighlight({ color: c.color }).run();
                                    else editor.chain().focus().unsetHighlight().run();
                                    onClose();
                                }}
                                className="w-6 h-6 rounded border border-white/10 hover:scale-110 transition-transform"
                                style={{ backgroundColor: c.color || 'transparent' }}
                                title={c.name}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Extension
export const DragHandleMenu = Extension.create({
    name: 'dragHandleMenu',

    addProseMirrorPlugins() {
        const editor = this.editor;
        let popup: TippyInstance | null = null;
        let root: Root | null = null;

        const hideMenu = () => {
            popup?.destroy();
            popup = null;
            root?.unmount();
            root = null;
        };

        const showMenu = (coords: { x: number; y: number }) => {
            hideMenu();

            const element = document.createElement('div');

            popup = tippy(document.body, {
                getReferenceClientRect: () => ({
                    width: 0, height: 0,
                    top: coords.y, bottom: coords.y,
                    left: coords.x, right: coords.x,
                    x: coords.x, y: coords.y,
                    toJSON: () => ({}),
                }),
                appendTo: () => document.body,
                content: element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'right-start',
            });

            root = createRoot(element);
            root.render(
                <DragHandleMenuComponent
                    editor={editor}
                    onClose={hideMenu}
                />
            );
        };

        return [
            new Plugin({
                key: new PluginKey('dragHandleMenu'),
                props: {
                    handleDOMEvents: {
                        click(view, event) {
                            const target = event.target as HTMLElement;
                            // Check if clicked element is the drag handle
                            if (target.classList.contains('drag-handle') || target.closest('.drag-handle')) {
                                event.preventDefault();
                                event.stopPropagation();

                                // Find the block that this drag handle belongs to
                                const blockElement = target.closest('[data-node-view-wrapper]') || target.parentElement;
                                if (blockElement) {
                                    const pos = view.posAtDOM(blockElement, 0);
                                    if (pos !== undefined) {
                                        editor.chain().focus().setTextSelection(pos).run();
                                    }
                                }

                                showMenu({ x: event.clientX, y: event.clientY });
                                return true;
                            }
                            return false;
                        },
                        // Close menu when clicking elsewhere
                        mousedown(view, event) {
                            if (popup && !(event.target as HTMLElement).closest('[data-tippy-root]')) {
                                hideMenu();
                            }
                            return false;
                        },
                    },
                },
                view() {
                    return {
                        destroy() {
                            hideMenu();
                        },
                    };
                },
            }),
        ];
    },
});

export default DragHandleMenu;
