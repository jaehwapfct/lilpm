import React, { useState, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { AlignLeft, AlignCenter, AlignRight, Maximize2, Trash2 } from 'lucide-react';

/**
 * Resizable Image Component for TipTap editor
 * 
 * Enhanced:
 * - Drag resize handles (left/right)
 * - Width input (px)
 * - Alignment options (left, center, right)
 * - Fullscreen toggle
 * - Delete button
 */
export const ResizableImageComponent = ({ node, updateAttributes, selected, deleteNode }: NodeViewProps) => {
    const [isResizing, setIsResizing] = useState(false);
    const [widthInput, setWidthInput] = useState(node.attrs.width?.toString() || '');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const alignment = node.attrs.alignment || 'center';

    const handleMouseDown = (e: React.MouseEvent, direction: 'left' | 'right') => {
        e.preventDefault();
        setIsResizing(true);
        startX.current = e.clientX;
        startWidth.current = imageRef.current?.offsetWidth || 0;

        const handleMouseMove = (e: MouseEvent) => {
            const diff = direction === 'right' ? e.clientX - startX.current : startX.current - e.clientX;
            const newWidth = Math.max(50, startWidth.current + diff);
            updateAttributes({ width: newWidth });
            setWidthInput(newWidth.toString());
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setWidthInput(value);
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 50) {
            updateAttributes({ width: numValue });
        }
    };

    const alignmentClass = {
        left: 'mr-auto',
        center: 'mx-auto',
        right: 'ml-auto',
    }[alignment] || 'mx-auto';

    if (isFullscreen) {
        return (
            <NodeViewWrapper>
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-pointer"
                    onClick={() => setIsFullscreen(false)}
                >
                    <img
                        src={node.attrs.src}
                        alt={node.attrs.alt || ''}
                        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                    />
                    <button
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20"
                        onClick={() => setIsFullscreen(false)}
                    >
                        <Maximize2 className="h-5 w-5 text-white" />
                    </button>
                </div>
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper className={`relative my-2 group flex ${
            alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center'
        }`}>
            <div className={cn(
                "relative inline-block",
                selected && "ring-2 ring-cyan-500 rounded-lg",
                isResizing && "select-none",
                !selected && "hover:ring-2 hover:ring-cyan-400/60 rounded-lg transition-all"
            )}>
                <img
                    ref={imageRef}
                    src={node.attrs.src}
                    alt={node.attrs.alt || ''}
                    style={{ width: node.attrs.width ? `${node.attrs.width}px` : 'auto' }}
                    className="rounded-lg max-w-full cursor-pointer"
                    draggable={false}
                    onDoubleClick={() => setIsFullscreen(true)}
                />

                {/* Resize handles */}
                <>
                    {/* Left handle */}
                    <div
                        className={cn(
                            "absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-cyan-500/50 rounded-l-lg transition-opacity",
                            selected ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                        )}
                        onMouseDown={(e) => handleMouseDown(e, 'left')}
                    />
                    {/* Right handle */}
                    <div
                        className={cn(
                            "absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-cyan-500/50 rounded-r-lg transition-opacity",
                            selected ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                        )}
                        onMouseDown={(e) => handleMouseDown(e, 'right')}
                    />

                    {/* Toolbar - alignment, size, actions */}
                    <div className={cn(
                        "absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-1 z-10 transition-opacity",
                        selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                        <div className="flex items-center gap-0.5 bg-[#0d0d0f] border border-white/10 rounded-lg px-1 py-0.5 shadow-lg">
                            {/* Alignment buttons */}
                            <button
                                onClick={() => updateAttributes({ alignment: 'left' })}
                                className={cn("p-1 rounded hover:bg-white/5", alignment === 'left' && 'bg-white/10')}
                                title="Align left"
                            >
                                <AlignLeft className="h-3 w-3 text-slate-400" />
                            </button>
                            <button
                                onClick={() => updateAttributes({ alignment: 'center' })}
                                className={cn("p-1 rounded hover:bg-white/5", alignment === 'center' && 'bg-white/10')}
                                title="Align center"
                            >
                                <AlignCenter className="h-3 w-3 text-slate-400" />
                            </button>
                            <button
                                onClick={() => updateAttributes({ alignment: 'right' })}
                                className={cn("p-1 rounded hover:bg-white/5", alignment === 'right' && 'bg-white/10')}
                                title="Align right"
                            >
                                <AlignRight className="h-3 w-3 text-slate-400" />
                            </button>

                            <div className="w-px h-4 bg-white/10 mx-0.5" />

                            {/* Width input */}
                            <input
                                type="number"
                                value={widthInput}
                                onChange={handleWidthChange}
                                className="w-12 text-[10px] text-center bg-transparent border-none focus:outline-none"
                                placeholder="W"
                                min="50"
                            />
                            <span className="text-[10px] text-slate-400 mr-1">px</span>

                            <div className="w-px h-4 bg-white/10 mx-0.5" />

                            {/* Fullscreen */}
                            <button
                                onClick={() => setIsFullscreen(true)}
                                className="p-1 rounded hover:bg-white/5"
                                title="Full screen"
                            >
                                <Maximize2 className="h-3 w-3 text-slate-400" />
                            </button>

                            {/* Delete */}
                            <button
                                onClick={deleteNode}
                                className="p-1 rounded hover:bg-destructive/10"
                                title="Delete image"
                            >
                                <Trash2 className="h-3 w-3 text-slate-400" />
                            </button>
                        </div>
                    </div>
                </>
            </div>
        </NodeViewWrapper>
    );
};

/**
 * Custom Resizable Image Extension for TipTap
 * Extends the base Image extension with resizing + alignment
 */
export const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                parseHTML: (element) => element.getAttribute('width'),
                renderHTML: (attributes) => {
                    if (!attributes.width) return {};
                    return { width: attributes.width };
                },
            },
            alignment: {
                default: 'center',
                parseHTML: (element) => element.getAttribute('data-alignment') || 'center',
                renderHTML: (attributes) => {
                    if (!attributes.alignment || attributes.alignment === 'center') return {};
                    return { 'data-alignment': attributes.alignment };
                },
            },
        };
    },

    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageComponent);
    },
});

export default ResizableImage;
