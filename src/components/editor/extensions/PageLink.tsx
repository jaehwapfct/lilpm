/**
 * PageLink Extension for TipTap
 * 
 * Implements Notion-style '[[ ' commands for linking to workspace pages.
 * Also implements '+' command for creating sub-pages.
 * 
 * When user types '[[', a popup appears to search and link pages.
 * When user types '+', a popup appears to create a new sub-page.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { createRoot, Root } from 'react-dom/client';
import React, { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Search, ArrowRight, ExternalLink } from 'lucide-react';

// ============================================================
// Types
// ============================================================
export interface PageLinkItem {
    id: string;
    title: string;
    type: 'prd' | 'issue' | 'page';
    emoji?: string;
    path?: string;
}

export interface PageLinkOptions {
    /**
     * Callback to search for pages in the workspace
     */
    onSearchPages?: (query: string) => Promise<PageLinkItem[]>;
    /**
     * Callback when a page link is inserted
     */
    onPageLinkInsert?: (pageId: string, pageTitle: string) => void;
    /**
     * Callback to create a new sub-page
     */
    onCreateSubPage?: (title: string) => Promise<PageLinkItem | null>;
    /**
     * Static list of pages for when no search callback is provided
     */
    pages?: PageLinkItem[];
}

// ============================================================
// Page Search/Link Popup Component
// ============================================================
function PageLinkMenu({
    query,
    pages,
    selectedIndex,
    onSelect,
    onCreateNew,
    mode,
}: {
    query: string;
    pages: PageLinkItem[];
    selectedIndex: number;
    onSelect: (page: PageLinkItem) => void;
    onCreateNew: (title: string) => void;
    mode: 'link' | 'create';
}) {
    const menuRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

    useEffect(() => {
        const selectedButton = itemRefs.current.get(selectedIndex);
        if (selectedButton && menuRef.current) {
            selectedButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedIndex]);

    const filteredPages = pages.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase())
    );

    const showCreateOption = query.length > 0;
    const totalItems = filteredPages.length + (showCreateOption ? 1 : 0);

    return (
        <div
            ref={menuRef}
            className="bg-[#1a1a1f] border border-white/10 rounded-lg shadow-lg overflow-hidden max-h-[300px] overflow-y-auto w-[300px]"
        >
            {/* Header */}
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 bg-white/5 sticky top-0 z-10 flex items-center gap-1.5">
                {mode === 'link' ? (
                    <>
                        <Search className="h-3 w-3" />
                        Link to page
                    </>
                ) : (
                    <>
                        <Plus className="h-3 w-3" />
                        Create or link page
                    </>
                )}
            </div>

            {/* Create new option */}
            {showCreateOption && (
                <button
                    ref={(el) => { if (el) itemRefs.current.set(0, el); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors ${selectedIndex === 0 ? 'bg-white/10' : ''}`}
                    onClick={() => onCreateNew(query)}
                >
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-primary/10">
                        <Plus className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                            {mode === 'create' ? 'Create' : 'Add'} "{query}"
                        </div>
                        <div className="text-xs text-slate-400">
                            {mode === 'create' ? 'New sub-page' : 'New page'}
                        </div>
                    </div>
                </button>
            )}

            {/* Existing pages */}
            {filteredPages.map((page, i) => {
                const itemIndex = showCreateOption ? i + 1 : i;
                const isSelected = itemIndex === selectedIndex;

                return (
                    <button
                        key={page.id}
                        ref={(el) => { if (el) itemRefs.current.set(itemIndex, el); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors ${isSelected ? 'bg-white/10' : ''}`}
                        onClick={() => onSelect(page)}
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded bg-[#121215] text-base">
                            {page.emoji || (page.type === 'prd' ? '📋' : page.type === 'issue' ? '🎯' : '📄')}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{page.title}</div>
                            <div className="text-xs text-slate-400 uppercase">{page.type}</div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                    </button>
                );
            })}

            {filteredPages.length === 0 && !showCreateOption && (
                <div className="px-3 py-6 text-center text-sm text-slate-400">
                    {query ? 'No pages found' : 'Type to search pages...'}
                </div>
            )}
        </div>
    );
}

// ============================================================
// Extension
// ============================================================
export const PageLink = Extension.create<PageLinkOptions>({
    name: 'pageLink',

    addOptions() {
        return {
            onSearchPages: undefined,
            onPageLinkInsert: undefined,
            onCreateSubPage: undefined,
            pages: [],
        };
    },

    addProseMirrorPlugins() {
        const editor = this.editor;
        const options = this.options;

        let popup: TippyInstance | null = null;
        let root: Root | null = null;
        let selectedIndex = 0;
        let currentPages: PageLinkItem[] = [];
        let query = '';
        let mode: 'link' | 'create' = 'link';

        const getTotalItems = () => {
            const filtered = currentPages.filter(p =>
                p.title.toLowerCase().includes(query.toLowerCase())
            );
            return filtered.length + (query.length > 0 ? 1 : 0);
        };

        const updateMenu = () => {
            if (!root) return;

            const filteredPages = currentPages.filter(p =>
                p.title.toLowerCase().includes(query.toLowerCase())
            );

            root.render(
                <PageLinkMenu
                    query={query}
                    pages={currentPages}
                    selectedIndex={selectedIndex}
                    mode={mode}
                    onSelect={(page) => {
                        insertPageLink(page);
                        hideMenu();
                    }}
                    onCreateNew={(title) => {
                        createAndInsertPage(title);
                    }}
                />
            );
        };

        const insertPageLink = (page: PageLinkItem) => {
            const { from } = editor.state.selection;
            // Calculate the range to delete (the trigger + query)
            const triggerLen = mode === 'link' ? 2 : 1; // [[ or +
            const deleteFrom = from - query.length - triggerLen;
            const deleteTo = from;

            const path = page.type === 'prd' ? `/prd/${page.id}` : `/issues/${page.id}`;
            const emoji = page.emoji || (page.type === 'prd' ? '📋' : '🎯');

            editor.chain().focus().deleteRange({ from: deleteFrom, to: deleteTo }).insertContent([
                {
                    type: 'text',
                    marks: [
                        {
                            type: 'link',
                            attrs: { href: path },
                        },
                    ],
                    text: `${emoji} ${page.title}`,
                },
                {
                    type: 'text',
                    text: ' ',
                },
            ]).run();

            options.onPageLinkInsert?.(page.id, page.title);
        };

        const createAndInsertPage = async (title: string) => {
            if (options.onCreateSubPage) {
                const newPage = await options.onCreateSubPage(title);
                if (newPage) {
                    insertPageLink(newPage);
                }
            } else {
                // Fallback: create a local page reference
                const fakePage: PageLinkItem = {
                    id: crypto.randomUUID(),
                    title,
                    type: 'page',
                    emoji: '📄',
                };
                insertPageLink(fakePage);
            }
            hideMenu();
        };

        const showMenu = (coords: { left: number; top: number }) => {
            const element = document.createElement('div');
            element.className = 'page-link-container';

            popup = tippy(document.body, {
                getReferenceClientRect: () => ({
                    width: 0, height: 0,
                    top: coords.top, bottom: coords.top,
                    left: coords.left, right: coords.left,
                    x: coords.left, y: coords.top,
                    toJSON: () => ({}),
                }),
                appendTo: () => document.body,
                content: element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                animation: 'shift-away',
            });

            root = createRoot(element);

            // Load pages
            if (options.onSearchPages) {
                options.onSearchPages('').then((pages) => {
                    currentPages = pages;
                    updateMenu();
                });
            } else {
                currentPages = options.pages || [];
                updateMenu();
            }
        };

        const hideMenu = () => {
            popup?.destroy();
            popup = null;
            root?.unmount();
            root = null;
            selectedIndex = 0;
            currentPages = [];
            query = '';
        };

        return [
            new Plugin({
                key: new PluginKey('pageLink'),
                props: {
                    handleKeyDown(view, event) {
                        if (!popup) return false;

                        if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            const total = getTotalItems();
                            if (total > 0) {
                                selectedIndex = (selectedIndex + 1) % total;
                                updateMenu();
                            }
                            return true;
                        }
                        if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            const total = getTotalItems();
                            if (total > 0) {
                                selectedIndex = (selectedIndex - 1 + total) % total;
                                updateMenu();
                            }
                            return true;
                        }
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            const filteredPages = currentPages.filter(p =>
                                p.title.toLowerCase().includes(query.toLowerCase())
                            );
                            const hasCreateOption = query.length > 0;

                            if (hasCreateOption && selectedIndex === 0) {
                                createAndInsertPage(query);
                            } else {
                                const pageIndex = hasCreateOption ? selectedIndex - 1 : selectedIndex;
                                const page = filteredPages[pageIndex];
                                if (page) {
                                    insertPageLink(page);
                                    hideMenu();
                                }
                            }
                            return true;
                        }
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            hideMenu();
                            return true;
                        }
                        return false;
                    },
                },
                view() {
                    return {
                        update(view) {
                            const { state } = view;
                            const { selection } = state;
                            const { $from, from } = selection;

                            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

                            // Check for [[ trigger
                            const bracketMatch = textBefore.match(/\[\[([^\]]*)$/);
                            // Check for + trigger at start of line or after space
                            const plusMatch = textBefore.match(/(?:^|\s)\+([a-zA-Z0-9\s]*)$/);

                            if (bracketMatch) {
                                query = bracketMatch[1] || '';
                                mode = 'link';
                                selectedIndex = 0;

                                if (!popup) {
                                    const coords = view.coordsAtPos(from);
                                    showMenu({ left: coords.left, top: coords.bottom + 5 });
                                } else {
                                    // Search with query
                                    if (options.onSearchPages && query) {
                                        options.onSearchPages(query).then((pages) => {
                                            currentPages = pages;
                                            updateMenu();
                                        });
                                    } else {
                                        updateMenu();
                                    }
                                }
                            } else if (plusMatch) {
                                query = plusMatch[1] || '';
                                mode = 'create';
                                selectedIndex = 0;

                                if (!popup) {
                                    const coords = view.coordsAtPos(from);
                                    showMenu({ left: coords.left, top: coords.bottom + 5 });
                                } else {
                                    if (options.onSearchPages && query) {
                                        options.onSearchPages(query).then((pages) => {
                                            currentPages = pages;
                                            updateMenu();
                                        });
                                    } else {
                                        updateMenu();
                                    }
                                }
                            } else if (popup) {
                                hideMenu();
                            }
                        },
                        destroy() {
                            hideMenu();
                        },
                    };
                },
            }),
        ];
    },
});

export default PageLink;
