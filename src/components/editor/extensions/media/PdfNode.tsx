/**
 * PDF Embed Node Extension
 * 
 * Allows embedding PDF files inline in the editor.
 * Supports URL input and file upload with an inline PDF viewer.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Upload, X, ExternalLink, Maximize2, Minimize2, Loader2 } from 'lucide-react';

const PdfComponent: React.FC<any> = ({ node, updateAttributes, selected, deleteNode }) => {
    const { src, title, height } = node.attrs;
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUrlSubmit = (url: string) => {
        const formatted = url.startsWith('http') ? url : `https://${url}`;
        updateAttributes({ src: formatted, title: title || 'PDF Document' });
    };

    const handleFileSelect = useCallback(async (file: File) => {
        if (!file.type.includes('pdf')) return;
        setIsLoading(true);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            updateAttributes({ src: base64, title: file.name });
        } catch (err) {
            console.error('Failed to load PDF:', err);
        } finally {
            setIsLoading(false);
        }
    }, [updateAttributes, title]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    if (!src) {
        return (
            <NodeViewWrapper>
                <div
                    className={cn(
                        'my-4 rounded-lg border-2 border-dashed overflow-hidden',
                        selected ? 'border-primary' : isDragOver ? 'border-primary bg-primary/5' : 'border-white/10'
                    )}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                >
                    <div className="p-8 bg-white/5 text-center">
                        {isLoading ? (
                            <>
                                <Loader2 className="h-10 w-10 mx-auto mb-4 text-primary animate-spin" />
                                <p className="text-sm text-slate-400">Loading PDF...</p>
                            </>
                        ) : (
                            <>
                                <FileText className="h-10 w-10 mx-auto mb-4 text-slate-400/50" />
                                <div className="max-w-md mx-auto space-y-3">
                                    <input
                                        type="url"
                                        placeholder="Paste PDF URL..."
                                        className="w-full px-4 py-2 rounded-lg border bg-[#0d0d0f] text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = (e.target as HTMLInputElement).value;
                                                if (val) handleUrlSubmit(val);
                                            }
                                            if (e.key === 'Escape') deleteNode();
                                        }}
                                    />
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <div className="flex-1 h-px bg-white/10" />
                                        <span>or</span>
                                        <div className="flex-1 h-px bg-white/10" />
                                    </div>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full px-4 py-2 border border-white/10 rounded-lg text-sm hover:bg-white/5 flex items-center justify-center gap-2"
                                    >
                                        <Upload className="h-4 w-4" />
                                        Upload PDF file
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileSelect(file);
                                        }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper>
            <div
                className={cn(
                    'my-4 rounded-lg border overflow-hidden group',
                    selected && 'ring-2 ring-primary/50',
                    isFullScreen && 'fixed inset-4 z-50 bg-[#0d0d0f]'
                )}
            >
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b">
                    <FileText className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium truncate flex-1">{title || 'PDF Document'}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            className="p-1 hover:bg-white/5 rounded"
                            title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
                        >
                            {isFullScreen ? <Minimize2 className="h-3.5 w-3.5 text-slate-400" /> : <Maximize2 className="h-3.5 w-3.5 text-slate-400" />}
                        </button>
                        {src.startsWith('http') && (
                            <a href={src} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/5 rounded">
                                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                            </a>
                        )}
                        <button onClick={deleteNode} className="p-1 hover:bg-destructive/10 rounded">
                            <X className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                    </div>
                </div>
                {/* PDF Viewer */}
                <div style={{ height: isFullScreen ? 'calc(100vh - 120px)' : `${height || 500}px` }}>
                    <iframe
                        src={src.startsWith('data:') ? src : `${src}#toolbar=1&view=FitH`}
                        className="w-full h-full border-0"
                        title={title || 'PDF Document'}
                    />
                </div>
                {/* Resize handle */}
                {!isFullScreen && (
                    <div
                        className="h-2 bg-white/5 hover:bg-primary/10 cursor-row-resize flex items-center justify-center"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            const startY = e.clientY;
                            const startHeight = height || 500;
                            const onMove = (ev: MouseEvent) => {
                                const newHeight = Math.max(200, startHeight + ev.clientY - startY);
                                updateAttributes({ height: newHeight });
                            };
                            const onUp = () => {
                                document.removeEventListener('mousemove', onMove);
                                document.removeEventListener('mouseup', onUp);
                            };
                            document.addEventListener('mousemove', onMove);
                            document.addEventListener('mouseup', onUp);
                        }}
                    >
                        <div className="w-8 h-0.5 rounded bg-slate-600" />
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};

export const PdfNode = Node.create({
    name: 'pdf',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            src: { default: '', parseHTML: el => el.getAttribute('data-src') || '', renderHTML: a => ({ 'data-src': a.src }) },
            title: { default: '', parseHTML: el => el.getAttribute('data-title') || '', renderHTML: a => ({ 'data-title': a.title }) },
            height: { default: 500, parseHTML: el => parseInt(el.getAttribute('data-height') || '500'), renderHTML: a => ({ 'data-height': String(a.height) }) },
        };
    },

    parseHTML() { return [{ tag: 'div[data-type="pdf"]' }]; },
    renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-type': 'pdf' }, HTMLAttributes)]; },
    addNodeView() { return ReactNodeViewRenderer(PdfComponent); },
});

export default PdfNode;
