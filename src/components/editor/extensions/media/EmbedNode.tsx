/**
 * Embed Node Extension
 * 
 * General-purpose iFrame embed for external services.
 * Supports: Figma, Google Docs/Sheets/Slides, Miro, Loom,
 * CodePen, CodeSandbox, Twitter/X, Spotify, and any oEmbed URL.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Globe, X, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

// Known embed providers and their URL patterns
const EMBED_PROVIDERS: { name: string; pattern: RegExp; transform: (url: string) => string; icon?: string }[] = [
    {
        name: 'Figma',
        pattern: /figma\.com\/(file|proto|design)\//,
        transform: (url) => `https://www.figma.com/embed?embed_host=notion&url=${encodeURIComponent(url)}`,
        icon: '🎨',
    },
    {
        name: 'Google Docs',
        pattern: /docs\.google\.com\/document/,
        transform: (url) => url.replace(/\/edit.*$/, '/preview'),
        icon: '📝',
    },
    {
        name: 'Google Sheets',
        pattern: /docs\.google\.com\/spreadsheets/,
        transform: (url) => url.replace(/\/edit.*$/, '/preview'),
        icon: '📊',
    },
    {
        name: 'Google Slides',
        pattern: /docs\.google\.com\/presentation/,
        transform: (url) => url.replace(/\/edit.*$/, '/embed'),
        icon: '📽️',
    },
    {
        name: 'Miro',
        pattern: /miro\.com\/app\/board/,
        transform: (url) => url.replace('app/board', 'app/live-embed'),
        icon: '🎯',
    },
    {
        name: 'Loom',
        pattern: /loom\.com\/share/,
        transform: (url) => url.replace('/share/', '/embed/'),
        icon: '🎥',
    },
    {
        name: 'CodePen',
        pattern: /codepen\.io\/[^/]+\/pen/,
        transform: (url) => url.replace('/pen/', '/embed/'),
        icon: '💻',
    },
    {
        name: 'CodeSandbox',
        pattern: /codesandbox\.io\/s\//,
        transform: (url) => url.replace('codesandbox.io/s/', 'codesandbox.io/embed/'),
        icon: '📦',
    },
    {
        name: 'Spotify',
        pattern: /open\.spotify\.com\/(track|album|playlist|episode)/,
        transform: (url) => url.replace('open.spotify.com', 'open.spotify.com/embed'),
        icon: '🎵',
    },
    {
        name: 'Airtable',
        pattern: /airtable\.com\//,
        transform: (url) => url.includes('/embed/') ? url : url.replace('airtable.com/', 'airtable.com/embed/'),
        icon: '📋',
    },
];

function detectProvider(url: string) {
    for (const provider of EMBED_PROVIDERS) {
        if (provider.pattern.test(url)) {
            return provider;
        }
    }
    return null;
}

const EmbedComponent: React.FC<any> = ({ node, updateAttributes, selected, deleteNode }) => {
    const { src, providerName, providerIcon, embedUrl, height } = node.attrs;
    const [isFullScreen, setIsFullScreen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (url: string) => {
        const formatted = url.startsWith('http') ? url : `https://${url}`;
        const provider = detectProvider(formatted);

        updateAttributes({
            src: formatted,
            providerName: provider?.name || 'Embed',
            providerIcon: provider?.icon || '🌐',
            embedUrl: provider ? provider.transform(formatted) : formatted,
        });
    };

    if (!src) {
        return (
            <NodeViewWrapper>
                <div className={cn('my-4 rounded-lg border-2 border-dashed', selected ? 'border-primary' : 'border-white/10')}>
                    <div className="p-8 bg-white/5 text-center">
                        <Globe className="h-10 w-10 mx-auto mb-4 text-slate-400/50" />
                        <div className="max-w-md mx-auto">
                            <input
                                ref={inputRef}
                                type="url"
                                placeholder="Paste embed URL (Figma, Google Docs, Miro, Loom, etc.)..."
                                className="w-full px-4 py-2 rounded-lg border bg-[#0d0d0f] text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = (e.target as HTMLInputElement).value;
                                        if (val) handleSubmit(val);
                                    }
                                    if (e.key === 'Escape') deleteNode();
                                }}
                            />
                            <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                                {EMBED_PROVIDERS.slice(0, 6).map(p => (
                                    <span key={p.name} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                                        {p.icon} {p.name}
                                    </span>
                                ))}
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">+ more</span>
                            </div>
                        </div>
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
                    <span className="text-sm">{providerIcon || '🌐'}</span>
                    <span className="text-sm font-medium truncate flex-1">{providerName || 'Embed'}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            className="p-1 hover:bg-white/5 rounded"
                        >
                            {isFullScreen ? <Minimize2 className="h-3.5 w-3.5 text-slate-400" /> : <Maximize2 className="h-3.5 w-3.5 text-slate-400" />}
                        </button>
                        <a href={src} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white/5 rounded">
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                        </a>
                        <button onClick={deleteNode} className="p-1 hover:bg-destructive/10 rounded">
                            <X className="h-3.5 w-3.5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Embed iframe */}
                <div style={{ height: isFullScreen ? 'calc(100vh - 120px)' : `${height || 450}px` }}>
                    <iframe
                        src={embedUrl || src}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
                        title={providerName || 'Embed'}
                    />
                </div>

                {/* Resize handle */}
                {!isFullScreen && (
                    <div
                        className="h-2 bg-white/5 hover:bg-primary/10 cursor-row-resize flex items-center justify-center"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            const startY = e.clientY;
                            const startH = height || 450;
                            const onMove = (ev: MouseEvent) => updateAttributes({ height: Math.max(200, startH + ev.clientY - startY) });
                            const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
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

export const EmbedNode = Node.create({
    name: 'embed',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            src: { default: '' },
            embedUrl: { default: '' },
            providerName: { default: '' },
            providerIcon: { default: '🌐' },
            height: { default: 450 },
        };
    },

    parseHTML() { return [{ tag: 'div[data-type="embed"]' }]; },
    renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes({ 'data-type': 'embed' }, HTMLAttributes)]; },
    addNodeView() { return ReactNodeViewRenderer(EmbedComponent); },
});

export default EmbedNode;
