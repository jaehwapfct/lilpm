import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Link2, ExternalLink, Globe, Loader2, X, RefreshCw } from 'lucide-react';

/**
 * BookmarkNode Extension
 * Embeds a URL as a rich preview card with title, description, favicon, and image.
 * 
 * Fixed: Improved metadata fetching with multiple fallback strategies.
 * Fixed: Added loading states and error handling.
 * Fixed: Proper URL formatting and validation.
 */

// Use TipTap's NodeViewProps directly
const BookmarkComponent: React.FC<any> = ({ node, updateAttributes, selected, deleteNode }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { url, title, description, image, favicon } = node.attrs;

    const formatUrl = (inputUrl: string): string => {
        const trimmed = inputUrl.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
        return `https://${trimmed}`;
    };

    const fetchMetadata = async (inputUrl: string) => {
        const formattedUrl = formatUrl(inputUrl);
        if (!formattedUrl) {
            setError('Please enter a valid URL');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const urlObj = new URL(formattedUrl);
            const domain = urlObj.hostname;

            // Strategy 1: Try to get OG metadata via a lightweight proxy
            // jsonlink.io is a free open graph scraper
            let fetchedTitle = '';
            let fetchedDescription = '';
            let fetchedImage: string | null = null;

            try {
                const res = await fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(formattedUrl)}`, {
                    signal: AbortSignal.timeout(5000),
                });
                if (res.ok) {
                    const data = await res.json();
                    fetchedTitle = data.title || '';
                    fetchedDescription = data.description || '';
                    fetchedImage = data.images?.[0] || null;
                }
            } catch {
                // Fallback: use domain as title
            }

            // Fallback title from domain
            if (!fetchedTitle) {
                fetchedTitle = domain.replace('www.', '').split('.')[0];
                fetchedTitle = fetchedTitle.charAt(0).toUpperCase() + fetchedTitle.slice(1);
            }

            updateAttributes({
                url: formattedUrl,
                title: fetchedTitle,
                description: fetchedDescription || `Visit ${domain}`,
                favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
                image: fetchedImage,
            });
        } catch (err) {
            setError('Could not load bookmark. Please check the URL.');
            // Still save the URL with basic info
            try {
                const domain = new URL(formattedUrl).hostname;
                updateAttributes({
                    url: formattedUrl,
                    title: domain,
                    description: 'Click to visit this link',
                    favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
                });
            } catch {
                setError('Invalid URL format');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <NodeViewWrapper>
            <div
                className={cn(
                    'my-4 rounded-lg border overflow-hidden relative',
                    selected && 'ring-2 ring-primary/50'
                )}
            >
                {!url ? (
                    // URL Input
                    <div className="p-6 bg-white/5">
                        <div className="flex items-center gap-2 mb-4">
                            <Link2 className="h-5 w-5 text-slate-400" />
                            <span className="text-sm font-medium">Add a bookmark</span>
                            <div className="flex-1" />
                            <button
                                onClick={deleteNode}
                                className="p-1 hover:bg-white/5 rounded"
                            >
                                <X className="h-4 w-4 text-slate-400" />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="url"
                                placeholder="Paste a link to create bookmark..."
                                className="flex-1 px-4 py-2 rounded-lg border bg-[#0d0d0f] text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const target = e.target as HTMLInputElement;
                                        if (target.value) {
                                            fetchMetadata(target.value);
                                        }
                                    }
                                    if (e.key === 'Escape') {
                                        deleteNode();
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    const val = inputRef.current?.value;
                                    if (val) fetchMetadata(val);
                                }}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                            >
                                Embed
                            </button>
                        </div>
                        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
                        <p className="text-xs text-slate-400 mt-2">
                            Paste any URL to create a bookmark with a rich preview
                        </p>
                    </div>
                ) : (
                    // Bookmark Card
                    <div className="group relative">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex hover:bg-white/5 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Content */}
                            <div className="flex-1 p-4 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {favicon ? (
                                        <img
                                            src={favicon}
                                            alt=""
                                            className="h-4 w-4"
                                            onError={(e) => (e.currentTarget.style.display = 'none')}
                                        />
                                    ) : (
                                        <Globe className="h-4 w-4 text-slate-400" />
                                    )}
                                    <span className="text-xs text-slate-400 truncate">
                                        {(() => {
                                            try { return new URL(url).hostname; } catch { return url; }
                                        })()}
                                    </span>
                                </div>
                                <h4 className="font-medium text-sm truncate">{title || 'Untitled'}</h4>
                                {description && (
                                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{description}</p>
                                )}
                            </div>

                            {/* Image Preview */}
                            {image && (
                                <div className="w-40 h-28 flex-shrink-0 bg-[#121215]">
                                    <img
                                        src={image}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                </div>
                            )}
                        </a>

                        {/* Hover actions */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fetchMetadata(url);
                                }}
                                className="p-1.5 bg-[#1a1a1f] border rounded hover:bg-white/10"
                                title="Refresh metadata"
                            >
                                <RefreshCw className="h-3 w-3 text-slate-400" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteNode();
                                }}
                                className="p-1.5 bg-[#1a1a1f] border rounded hover:bg-destructive/10"
                                title="Remove bookmark"
                            >
                                <X className="h-3 w-3 text-slate-400" />
                            </button>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 bg-[#0d0d0f]/80 flex items-center justify-center rounded-lg">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                            <span className="text-sm text-slate-400">Loading preview...</span>
                        </div>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
};

// TipTap Extension
export const BookmarkNode = Node.create({
    name: 'bookmark',
    group: 'block',
    atom: true,

    addAttributes() {
        return {
            url: {
                default: '',
                parseHTML: element => element.getAttribute('data-url') || '',
                renderHTML: attributes => ({ 'data-url': attributes.url }),
            },
            title: {
                default: '',
                parseHTML: element => element.getAttribute('data-title') || '',
                renderHTML: attributes => ({ 'data-title': attributes.title }),
            },
            description: {
                default: '',
                parseHTML: element => element.getAttribute('data-description') || '',
                renderHTML: attributes => ({ 'data-description': attributes.description }),
            },
            image: {
                default: null,
                parseHTML: element => element.getAttribute('data-image'),
                renderHTML: attributes => ({ 'data-image': attributes.image }),
            },
            favicon: {
                default: null,
                parseHTML: element => element.getAttribute('data-favicon'),
                renderHTML: attributes => ({ 'data-favicon': attributes.favicon }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-type="bookmark"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes({ 'data-type': 'bookmark' }, HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(BookmarkComponent);
    },
});

export default BookmarkNode;
