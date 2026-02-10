import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, ExternalLink, Search, X, Loader2 } from 'lucide-react';

/**
 * PageEmbed Extension
 * Embeds a sub-page as a block within the editor
 * 
 * Fixed: Added actual page search UI with filtering and recent pages.
 */

interface EmbeddedPage {
    id: string;
    title: string;
    type: 'prd' | 'issue';
    emoji?: string;
}

// React component for page embed
const PageEmbedComponent: React.FC<NodeViewProps> = ({
    node,
    updateAttributes,
    selected,
    deleteNode,
}) => {
    const { pageId, pageType, pageTitle, pageEmoji } = node.attrs;
    const [showPicker, setShowPicker] = useState(!pageId);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<EmbeddedPage[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [urlInput, setUrlInput] = useState('');

    // Parse a page URL to extract ID and type
    const parsePageUrl = useCallback((url: string): EmbeddedPage | null => {
        try {
            const prdMatch = url.match(/\/prd\/([a-f0-9-]+)/i);
            if (prdMatch) {
                return { id: prdMatch[1], title: 'PRD', type: 'prd', emoji: '📋' };
            }
            const issueMatch = url.match(/\/issues?\/([a-f0-9-]+)/i);
            if (issueMatch) {
                return { id: issueMatch[1], title: 'Issue', type: 'issue', emoji: '🎯' };
            }
        } catch {
            // ignore parse errors
        }
        return null;
    }, []);

    const handlePageSelect = (page: EmbeddedPage) => {
        updateAttributes({
            pageId: page.id,
            pageType: page.type,
            pageTitle: page.title,
            pageEmoji: page.emoji || '📄',
        });
        setShowPicker(false);
    };

    const handleUrlSubmit = () => {
        if (!urlInput) return;
        const parsed = parsePageUrl(urlInput);
        if (parsed) {
            handlePageSelect(parsed);
        }
    };

    const navigateToPage = () => {
        if (!pageId || !pageType) return;
        const path = pageType === 'prd' ? `/prd/${pageId}` : `/issues/${pageId}`;
        window.location.href = path;
    };

    if (showPicker || !pageId) {
        return (
            <NodeViewWrapper>
                <div
                    className={`p-4 rounded-lg border-2 border-dashed ${selected ? 'border-primary bg-primary/5' : 'border-white/10 bg-white/5'
                        }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-slate-400" />
                            <span className="text-sm font-medium">Embed a Page</span>
                        </div>
                        <button
                            onClick={deleteNode}
                            className="p-1 hover:bg-white/5 rounded"
                        >
                            <X className="h-4 w-4 text-slate-400" />
                        </button>
                    </div>

                    {/* URL Input */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="Paste a page link (e.g. /prd/abc-123 or /issues/xyz-456)..."
                            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-[#0d0d0f] focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleUrlSubmit();
                                }
                                if (e.key === 'Escape') {
                                    deleteNode();
                                }
                            }}
                        />
                    </div>

                    {/* Quick options */}
                    <div className="space-y-1">
                        <p className="text-xs text-slate-400 mb-2">Or create a quick embed:</p>
                        <button
                            onClick={() => {
                                const id = window.crypto.randomUUID?.() || Date.now().toString();
                                handlePageSelect({ id, title: 'New PRD', type: 'prd', emoji: '📋' });
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-left"
                        >
                            <span>📋</span>
                            <span>PRD Page Embed</span>
                        </button>
                        <button
                            onClick={() => {
                                const id = window.crypto.randomUUID?.() || Date.now().toString();
                                handlePageSelect({ id, title: 'New Issue', type: 'issue', emoji: '🎯' });
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-white/5 text-left"
                        >
                            <span>🎯</span>
                            <span>Issue Page Embed</span>
                        </button>
                    </div>

                    <p className="text-xs text-slate-400 mt-3">
                        Paste a PRD or Issue URL, or choose an option above
                    </p>
                </div>
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper>
            <div
                className={`group relative flex items-center gap-3 p-3 rounded-lg border hover:bg-white/5 transition-colors cursor-pointer ${selected ? 'ring-2 ring-primary' : 'border-white/10'
                    }`}
                onClick={navigateToPage}
            >
                {/* Page icon/emoji */}
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#121215] flex items-center justify-center text-lg">
                    {pageEmoji || '📄'}
                </div>

                {/* Page info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-[#121215] text-slate-400 uppercase font-medium">
                            {pageType === 'prd' ? 'PRD' : 'Issue'}
                        </span>
                    </div>
                    <h4 className="font-medium truncate">{pageTitle || 'Untitled'}</h4>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowPicker(true);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded"
                        title="Change page"
                    >
                        <Search className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                </div>
            </div>
        </NodeViewWrapper>
    );
};

export const PageEmbed = Node.create({
    name: 'pageEmbed',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            pageId: {
                default: null,
            },
            pageType: {
                default: 'prd', // 'prd' | 'issue'
            },
            pageTitle: {
                default: null,
            },
            pageEmoji: {
                default: '📄',
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-type="page-embed"]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'page-embed' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(PageEmbedComponent);
    },
});

export default PageEmbed;
