import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { List, RefreshCw } from 'lucide-react';

/**
 * Table of Contents Node
 * 
 * Fixed: Auto-updates when headings change (no more manual refresh needed).
 * Uses editor transaction listener for real-time updates.
 */

interface TocHeading {
    level: number;
    text: string;
    pos: number;
}

const TocComponent: React.FC<any> = ({ editor, selected }) => {
    const [headings, setHeadings] = useState<TocHeading[]>([]);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const extractHeadings = useCallback(() => {
        const items: TocHeading[] = [];
        editor.state.doc.descendants((node: any, pos: number) => {
            if (node.type.name === 'heading') {
                items.push({
                    level: node.attrs.level,
                    text: node.textContent,
                    pos,
                });
            }
        });
        setHeadings(items);
    }, [editor]);

    useEffect(() => {
        // Initial extraction
        extractHeadings();

        // Subscribe to editor updates - debounced for performance
        const handleUpdate = () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(extractHeadings, 300);
        };

        editor.on('update', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [editor, extractHeadings]);

    const scrollToHeading = (pos: number) => {
        // Use TipTap's coordsAtPos to find the heading position and scroll
        try {
            const coords = editor.view.coordsAtPos(pos);
            const editorElement = editor.view.dom.closest('.ProseMirror')?.parentElement;
            if (editorElement) {
                const editorRect = editorElement.getBoundingClientRect();
                const scrollTarget = coords.top - editorRect.top + editorElement.scrollTop - 80;
                editorElement.scrollTo({ top: scrollTarget, behavior: 'smooth' });
            } else {
                window.scrollTo({ top: coords.top - 100, behavior: 'smooth' });
            }
            // Also set cursor to the heading
            editor.chain().focus().setTextSelection(pos + 1).run();
        } catch {
            // Fallback
        }
    };

    const getLevelPadding = (level: number) => `${(level - 1) * 16}px`;

    return (
        <NodeViewWrapper>
            <div
                className={cn(
                    'my-4 p-4 rounded-lg border bg-white/5',
                    selected && 'ring-2 ring-primary/50'
                )}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <List className="h-4 w-4" />
                        Table of Contents
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                            Auto-updates
                        </span>
                        <button
                            onClick={extractHeadings}
                            className="p-1 rounded hover:bg-white/5 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {headings.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">
                        Add headings to your document to see them here.
                    </p>
                ) : (
                    <nav className="space-y-0.5">
                        {headings.map((heading, index) => (
                            <button
                                key={`toc-${heading.pos}-${index}`}
                                onClick={() => scrollToHeading(heading.pos)}
                                className={cn(
                                    'block w-full text-left py-1 px-2 text-sm rounded hover:bg-white/5 transition-colors',
                                    heading.level === 1 && 'font-semibold',
                                    heading.level === 2 && 'text-slate-300',
                                    heading.level >= 3 && 'text-slate-400 text-xs'
                                )}
                                style={{ paddingLeft: getLevelPadding(heading.level) }}
                            >
                                {heading.text || `Heading ${heading.level}`}
                            </button>
                        ))}
                    </nav>
                )}
            </div>
        </NodeViewWrapper>
    );
};

export const TableOfContentsNode = Node.create({
    name: 'tableOfContents',
    group: 'block',
    atom: true,

    parseHTML() {
        return [{ tag: 'div[data-type="toc"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes({ 'data-type': 'toc' }, HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(TocComponent);
    },
});

export default TableOfContentsNode;
