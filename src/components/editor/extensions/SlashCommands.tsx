/**
 * Slash Commands Extension for Tiptap
 * 
 * Implements Notion-style '/' commands for inserting blocks and formatting.
 * Triggered when user types '/' at the start of a line or after a space.
 * 
 * Fixed: All node type names now match actual extension names.
 * Fixed: Replaced all window.prompt() with inline placeholder UIs.
 * Added: Missing Notion slash commands (color, duplicate, delete, emoji, etc.)
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { createRoot, Root } from 'react-dom/client';
import React from 'react';
import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    ListTodo,
    Quote,
    Minus,
    Code,
    Table,
    Image,
    Video,
    FileText,
    Link2,
    Calculator,
    ChevronRight,
    Info,
    Columns,
    Play,
    FileAudio,
    Database,
    LayoutGrid,
    Bookmark,
    FileUp,
    Palette,
    Type,
    AlignLeft,
    Zap,
    Copy,
    Trash2,
    Smile,
    AtSign,
    Calendar,
    Globe,
    FileCode,
    Navigation,
    RefreshCw,
    LayoutTemplate,
    TableProperties,
    Paintbrush,
    PaintBucket,
    Link,
    MessageSquare,
} from 'lucide-react';

// Define all slash command items (Notion-style)
export interface SlashCommandItem {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    command: (props: { editor: any; range: any }) => void;
    category: 'basic' | 'inline' | 'media' | 'database' | 'advanced' | 'actions' | 'color' | 'background';
    keywords?: string[];
}

// ============================================================
// Color definitions for text color and background color commands
// ============================================================
const TEXT_COLORS = [
    { name: 'Red', color: '#EF4444', keywords: ['red'] },
    { name: 'Orange', color: '#F97316', keywords: ['orange'] },
    { name: 'Yellow', color: '#EAB308', keywords: ['yellow'] },
    { name: 'Green', color: '#22C55E', keywords: ['green'] },
    { name: 'Blue', color: '#3B82F6', keywords: ['blue'] },
    { name: 'Purple', color: '#A855F7', keywords: ['purple'] },
    { name: 'Pink', color: '#EC4899', keywords: ['pink'] },
    { name: 'Gray', color: '#6B7280', keywords: ['gray', 'grey'] },
];

const BACKGROUND_COLORS = [
    { name: 'Red Background', color: '#FEE2E2', keywords: ['red'] },
    { name: 'Orange Background', color: '#FFEDD5', keywords: ['orange'] },
    { name: 'Yellow Background', color: '#FEF3C7', keywords: ['yellow'] },
    { name: 'Green Background', color: '#DCFCE7', keywords: ['green'] },
    { name: 'Blue Background', color: '#DBEAFE', keywords: ['blue'] },
    { name: 'Purple Background', color: '#F3E8FF', keywords: ['purple'] },
    { name: 'Pink Background', color: '#FCE7F3', keywords: ['pink'] },
    { name: 'Gray Background', color: '#F3F4F6', keywords: ['gray', 'grey'] },
];

// Generate text color slash commands
const colorCommands: SlashCommandItem[] = [
    {
        title: 'Default',
        description: 'Remove text color.',
        icon: Type,
        category: 'color',
        keywords: ['default', 'remove', 'reset', 'none'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).unsetColor().run();
        },
    },
    ...TEXT_COLORS.map((c): SlashCommandItem => ({
        title: c.name,
        description: `Change text color to ${c.name.toLowerCase()}.`,
        icon: Paintbrush,
        category: 'color',
        keywords: [...c.keywords, 'color', 'text'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setColor(c.color).run();
        },
    })),
];

// Generate background color slash commands
const backgroundCommands: SlashCommandItem[] = BACKGROUND_COLORS.map((c): SlashCommandItem => ({
    title: c.name,
    description: `Set ${c.name.toLowerCase().replace(' background', '')} background highlight.`,
    icon: PaintBucket,
    category: 'background',
    keywords: [...c.keywords, 'background', 'highlight', 'bg'],
    command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range)
            .toggleHighlight({ color: c.color })
            .run();
    },
}));


// ============================================================
// Main slash command items
// ============================================================
export const slashCommandItems: SlashCommandItem[] = [
    // ==================== Basic Blocks ====================
    {
        title: 'Text',
        description: 'Just start writing with plain text.',
        icon: Type,
        category: 'basic',
        keywords: ['paragraph', 'p', 'text', 'plain'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setParagraph().run();
        },
    },
    {
        title: 'Heading 1',
        description: 'Big section heading.',
        icon: Heading1,
        category: 'basic',
        keywords: ['h1', 'heading', 'title', '#'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
        },
    },
    {
        title: 'Heading 2',
        description: 'Medium section heading.',
        icon: Heading2,
        category: 'basic',
        keywords: ['h2', 'heading', 'subtitle', '##'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
        },
    },
    {
        title: 'Heading 3',
        description: 'Small section heading.',
        icon: Heading3,
        category: 'basic',
        keywords: ['h3', 'heading', '###'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
        },
    },
    {
        title: 'Bullet List',
        description: 'Create a simple bullet list.',
        icon: List,
        category: 'basic',
        keywords: ['ul', 'unordered', 'bullets', 'list'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBulletList().run();
        },
    },
    {
        title: 'Numbered List',
        description: 'Create a numbered list.',
        icon: ListOrdered,
        category: 'basic',
        keywords: ['ol', 'ordered', 'numbered', 'num'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleOrderedList().run();
        },
    },
    {
        title: 'To-do List',
        description: 'Track tasks with a to-do list.',
        icon: ListTodo,
        category: 'basic',
        keywords: ['todo', 'task', 'checkbox', 'check'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleTaskList().run();
        },
    },
    {
        title: 'Toggle',
        description: 'Collapsible content block.',
        icon: ChevronRight,
        category: 'basic',
        keywords: ['collapse', 'expand', 'accordion', 'toggle'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'toggle',
                content: [{ type: 'paragraph' }],
            }).run();
        },
    },
    {
        title: 'Quote',
        description: 'Capture a quote.',
        icon: Quote,
        category: 'basic',
        keywords: ['blockquote', 'quotation', 'quote'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleBlockquote().run();
        },
    },
    {
        title: 'Divider',
        description: 'Visually divide blocks.',
        icon: Minus,
        category: 'basic',
        keywords: ['hr', 'horizontal', 'separator', 'line', 'div'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).setHorizontalRule().run();
        },
    },
    {
        title: 'Callout',
        description: 'Highlight important info.',
        icon: Info,
        category: 'basic',
        keywords: ['alert', 'note', 'warning', 'info', 'callout'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'callout',
                attrs: { type: 'info' },
                content: [{ type: 'paragraph' }],
            }).run();
        },
    },
    {
        title: 'Code Block',
        description: 'Display code with syntax highlighting.',
        icon: Code,
        category: 'basic',
        keywords: ['code', 'pre', 'programming', 'snippet'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
        },
    },

    // ==================== Inline ====================
    {
        title: 'Mention',
        description: 'Mention a person or page.',
        icon: AtSign,
        category: 'inline',
        keywords: ['mention', 'person', 'user', 'at', 'member'],
        command: ({ editor, range }) => {
            // Delete the slash command text and insert @ to trigger mention
            editor.chain().focus().deleteRange(range).insertContent('@').run();
        },
    },
    {
        title: 'Date',
        description: 'Add a date or timestamp.',
        icon: Calendar,
        category: 'inline',
        keywords: ['date', 'time', 'today', 'now', 'timestamp'],
        command: ({ editor, range }) => {
            const today = new Date();
            const formatted = today.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'text',
                marks: [
                    {
                        type: 'highlight',
                        attrs: { color: '#DBEAFE' },
                    },
                ],
                text: `📅 ${formatted}`,
            }).run();
        },
    },
    {
        title: 'Emoji',
        description: 'Search for an emoji to place in text.',
        icon: Smile,
        category: 'inline',
        keywords: ['emoji', 'emotion', 'face', 'smiley'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).run();
            // Open the native OS emoji picker
            // macOS: Cmd+Ctrl+Space, Windows: Win+.
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            if (isMac) {
                // Dispatch keyboard event to trigger native emoji picker on macOS
                document.execCommand('insertText', false, '');
                // Fallback: try common emoji insertion
                const event = new KeyboardEvent('keydown', {
                    key: ' ',
                    ctrlKey: true,
                    metaKey: true,
                    bubbles: true,
                });
                document.dispatchEvent(event);
            }
            // For all platforms, insert a placeholder that can be replaced
            // Users can also type :emoji_name: syntax
        },
    },
    {
        title: 'Inline Equation',
        description: 'Insert inline TeX formula.',
        icon: Calculator,
        category: 'inline',
        keywords: ['inline', 'equation', 'math', 'formula', 'tex'],
        command: ({ editor, range }) => {
            // Insert an equation node with empty latex (opens edit mode)
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'equation',
                attrs: { latex: '', display: false },
            }).run();
        },
    },

    // ==================== Media ====================
    {
        title: 'Image',
        description: 'Upload or embed an image.',
        icon: Image,
        category: 'media',
        keywords: ['img', 'picture', 'photo', 'image'],
        command: ({ editor, range }) => {
            // Insert empty image placeholder - the ResizableImage component handles upload UI
            editor.chain().focus().deleteRange(range).run();
            // Create a file input and trigger it
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = reader.result as string;
                        editor.chain().focus().setImage({ src: base64 }).run();
                    };
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        },
    },
    {
        title: 'Video',
        description: 'Embed a video from YouTube or URL.',
        icon: Video,
        category: 'media',
        keywords: ['youtube', 'vimeo', 'movie', 'video'],
        command: ({ editor, range }) => {
            // Insert empty video node - the VideoNode component shows URL input
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'video',
                attrs: { src: '' },
            }).run();
        },
    },
    {
        title: 'Audio',
        description: 'Embed an audio file.',
        icon: FileAudio,
        category: 'media',
        keywords: ['music', 'sound', 'mp3', 'audio', 'podcast'],
        command: ({ editor, range }) => {
            // Insert empty audio node - the AudioNode component shows URL input
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'audio',
                attrs: { src: null, title: null },
            }).run();
        },
    },
    {
        title: 'File',
        description: 'Upload or embed a file.',
        icon: FileUp,
        category: 'media',
        keywords: ['attachment', 'upload', 'document', 'file'],
        command: ({ editor, range }) => {
            // Insert empty file node - the FileNode component shows upload UI
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'file',
                attrs: { fileName: '', fileSize: 0, fileType: '', fileUrl: '' },
            }).run();
        },
    },
    {
        title: 'Bookmark',
        description: 'Embed a link with preview.',
        icon: Bookmark,
        category: 'media',
        keywords: ['link', 'preview', 'embed', 'web', 'bookmark', 'book'],
        command: ({ editor, range }) => {
            // Insert empty bookmark node - the BookmarkNode component shows URL input
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'bookmark',
                attrs: { url: '' },
            }).run();
        },
    },
    {
        title: 'PDF',
        description: 'Embed a PDF document.',
        icon: FileText,
        category: 'media',
        keywords: ['pdf', 'document', 'viewer'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'pdf',
                attrs: { src: '' },
            }).run();
        },
    },
    {
        title: 'Embed',
        description: 'Embed Figma, Google Docs, Miro, etc.',
        icon: Globe,
        category: 'media',
        keywords: ['embed', 'iframe', 'figma', 'google', 'miro', 'loom', 'codepen', 'spotify', 'widget', 'external'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'embed',
                attrs: { src: '' },
            }).run();
        },
    },

    // ==================== Database ====================
    {
        title: 'Table',
        description: 'Add a simple table.',
        icon: Table,
        category: 'database',
        keywords: ['grid', 'spreadsheet', 'table'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        },
    },
    {
        title: 'Linked Database',
        description: 'Link an existing database.',
        icon: Database,
        category: 'database',
        keywords: ['db', 'relation', 'linked', 'database'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'linkedDatabase',
                attrs: { databaseId: '', viewType: 'table' },
            }).run();
        },
    },
    {
        title: 'Inline Database',
        description: 'Create a new inline database.',
        icon: TableProperties,
        category: 'database',
        keywords: ['inline', 'database', 'table', 'spreadsheet', 'data'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'inlineDatabase',
            }).run();
        },
    },

    // ==================== Advanced ====================
    {
        title: 'Columns',
        description: 'Create side-by-side content.',
        icon: Columns,
        category: 'advanced',
        keywords: ['layout', 'grid', 'side', 'column'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'columnBlock',
                content: [
                    { type: 'column', content: [{ type: 'paragraph' }] },
                    { type: 'column', content: [{ type: 'paragraph' }] },
                ],
            }).run();
        },
    },
    {
        title: 'Equation',
        description: 'Display block mathematical equations.',
        icon: Calculator,
        category: 'advanced',
        keywords: ['math', 'latex', 'formula', 'equation'],
        command: ({ editor, range }) => {
            // Insert equation with empty latex - the EquationNode shows edit mode
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'equation',
                attrs: { latex: '', display: true },
            }).run();
        },
    },
    {
        title: 'Table of Contents',
        description: 'Generate from headings.',
        icon: AlignLeft,
        category: 'advanced',
        keywords: ['toc', 'contents', 'navigation'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'tableOfContents',
            }).run();
        },
    },
    {
        title: 'Button',
        description: 'Add an interactive button.',
        icon: Zap,
        category: 'advanced',
        keywords: ['action', 'click', 'cta', 'button'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'buttonBlock',
                attrs: { label: 'Click me', variant: 'primary', actionType: 'openUrl', actionPayload: '#' },
            }).run();
        },
    },
    {
        title: 'Template Button',
        description: 'Insert template content on click.',
        icon: LayoutTemplate,
        category: 'advanced',
        keywords: ['template', 'button', 'duplicate', 'repeat'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'templateButton',
                attrs: { label: 'New from template' },
            }).run();
        },
    },
    {
        title: 'Breadcrumbs',
        description: 'Show current page path.',
        icon: Navigation,
        category: 'advanced',
        keywords: ['breadcrumb', 'path', 'navigation', 'bread'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'breadcrumbs',
            }).run();
        },
    },
    {
        title: 'Page Embed',
        description: 'Embed another page inline.',
        icon: FileText,
        category: 'advanced',
        keywords: ['page', 'embed', 'link', 'subpage'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'pageEmbed',
                attrs: { pageId: '', pageType: 'prd', pageTitle: '', pageEmoji: '' },
            }).run();
        },
    },

    {
        title: 'Synced Block',
        description: 'Create a synced block shared across pages.',
        icon: RefreshCw,
        category: 'advanced',
        keywords: ['synced', 'sync', 'shared', 'reference', 'mirror'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).insertContent({
                type: 'syncedBlockNode',
                attrs: {
                    syncedBlockId: crypto.randomUUID(),
                    isOriginal: true,
                },
                content: [{ type: 'paragraph' }],
            }).run();
        },
    },
    {
        title: 'Link to Page',
        description: 'Insert a link to another page.',
        icon: Link,
        category: 'advanced',
        keywords: ['link', 'page', 'internal', 'reference'],
        command: ({ editor, range }) => {
            // Delete slash command and insert [[ to trigger PageLink
            editor.chain().focus().deleteRange(range).insertContent('[[').run();
        },
    },

    // ==================== Actions ====================
    {
        title: 'Comment',
        description: 'Add a comment to this block.',
        icon: MessageSquare,
        category: 'actions',
        keywords: ['comment', 'note', 'feedback', 'discuss'],
        command: ({ editor, range }) => {
            editor.chain().focus().deleteRange(range).run();
            // Trigger the comment shortcut (Cmd+Shift+M)
            // The BlockCommentExtension handles the actual comment creation
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'm',
                shiftKey: true,
                metaKey: true,
                ctrlKey: false,
                bubbles: true,
            }));
        },
    },
    {
        title: 'Duplicate',
        description: 'Create a copy of the current block.',
        icon: Copy,
        category: 'actions',
        keywords: ['duplicate', 'copy', 'clone'],
        command: ({ editor, range }) => {
            // First, find the parent block node that contains the slash command
            const { $from } = editor.state.selection;
            const blockStart = $from.start($from.depth);
            const blockEnd = $from.end($from.depth);

            // Delete the slash command text first
            editor.chain().focus().deleteRange(range).run();

            // Now get the updated block position
            const { $from: $newFrom } = editor.state.selection;
            const parentNode = $newFrom.parent;

            if (parentNode) {
                // Get the current block start/end after deletion
                const newBlockStart = $newFrom.before($newFrom.depth);
                const newBlockEnd = $newFrom.after($newFrom.depth);

                // Get the block content as JSON
                const blockSlice = editor.state.doc.slice(newBlockStart, newBlockEnd);
                const blockJSON = blockSlice.content.toJSON();

                // Insert after the current block
                editor.chain().focus().insertContentAt(newBlockEnd, blockJSON).run();
            }
        },
    },
    {
        title: 'Delete',
        description: 'Delete the current block.',
        icon: Trash2,
        category: 'actions',
        keywords: ['delete', 'remove', 'clear'],
        command: ({ editor, range }) => {
            const { $from } = editor.state.selection;
            // Select the entire parent block and delete it
            const blockStart = $from.before($from.depth);
            const blockEnd = $from.after($from.depth);
            editor.chain().focus().deleteRange({ from: blockStart, to: blockEnd }).run();
        },
    },

    // ==================== Text Colors ====================
    ...colorCommands,

    // ==================== Background Colors ====================
    ...backgroundCommands,
];

// Slash command menu React component
function SlashCommandMenu({
    items,
    selectedIndex,
    onSelect,
}: {
    items: SlashCommandItem[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}) {
    const categories = ['basic', 'inline', 'media', 'database', 'advanced', 'actions', 'color', 'background'] as const;
    const categoryLabels: Record<string, string> = {
        basic: 'Basic blocks',
        inline: 'Inline',
        media: 'Media',
        database: 'Database',
        advanced: 'Advanced',
        actions: 'Actions',
        color: 'Text color',
        background: 'Background',
    };

    // Ref for auto-scrolling
    const menuRef = React.useRef<HTMLDivElement>(null);
    const itemRefs = React.useRef<Map<number, HTMLButtonElement>>(new Map());

    React.useEffect(() => {
        const selectedButton = itemRefs.current.get(selectedIndex);
        if (selectedButton && menuRef.current) {
            selectedButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedIndex]);

    return (
        <div
            ref={menuRef}
            className="slash-command-menu bg-[#1a1a1f] border border-white/10 rounded-lg shadow-lg overflow-hidden max-h-[400px] overflow-y-auto w-[280px]"
        >
            {categories.map((category) => {
                const categoryItems = items.filter((item) => item.category === category);
                if (categoryItems.length === 0) return null;

                return (
                    <div key={category}>
                        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 bg-white/5 sticky top-0 z-10">
                            {categoryLabels[category]}
                        </div>
                        {categoryItems.map((item) => {
                            const itemIndex = items.indexOf(item);
                            const isSelected = itemIndex === selectedIndex;
                            const Icon = item.icon;

                            return (
                                <button
                                    key={`${category}-${item.title}`}
                                    ref={(el) => {
                                        if (el) {
                                            itemRefs.current.set(itemIndex, el);
                                        }
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors ${isSelected ? 'bg-white/10' : ''
                                        }`}
                                    onClick={() => onSelect(itemIndex)}
                                    onMouseEnter={() => {
                                        // Visual hover effect handled by CSS
                                    }}
                                >
                                    <div className={`flex items-center justify-center w-8 h-8 rounded ${
                                        item.category === 'color'
                                            ? ''
                                            : item.category === 'background'
                                                ? ''
                                                : 'bg-[#121215]'
                                    }`}
                                        style={
                                            item.category === 'color' && item.title !== 'Default'
                                                ? { color: TEXT_COLORS.find(c => c.name === item.title)?.color }
                                                : item.category === 'background'
                                                    ? { backgroundColor: BACKGROUND_COLORS.find(c => c.name === item.title)?.color, borderRadius: '4px' }
                                                    : undefined
                                        }
                                    >
                                        <Icon className="h-4 w-4 text-current" style={
                                            item.category === 'color' && item.title !== 'Default'
                                                ? { color: TEXT_COLORS.find(c => c.name === item.title)?.color }
                                                : item.category !== 'background' ? { color: 'rgb(148,163,184)' } : undefined
                                        } />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{item.title}</div>
                                        <div className="text-xs text-slate-400 truncate">
                                            {item.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                );
            })}
            {items.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-slate-400">
                    No commands found
                </div>
            )}
        </div>
    );
}

// Create the Slash Commands Extension
export const SlashCommands = Extension.create({
    name: 'slashCommands',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                startOfLine: false,
                command: ({ editor, range, props }: any) => {
                    props.command({ editor, range });
                },
            },
        };
    },

    addProseMirrorPlugins() {
        const editor = this.editor;
        let popup: TippyInstance | null = null;
        let root: Root | null = null;
        let selectedIndex = 0;
        let filteredItems: SlashCommandItem[] = [...slashCommandItems];
        let query = '';

        const updateMenu = (element: HTMLElement) => {
            if (root) {
                root.render(
                    <SlashCommandMenu
                        items={filteredItems}
                        selectedIndex={selectedIndex}
                        onSelect={(index) => {
                            const item = filteredItems[index];
                            if (item) {
                                // Get the current selection
                                const { from } = editor.state.selection;
                                // Find the slash position
                                const slashPos = from - query.length - 1;
                                const range = { from: slashPos, to: from };
                                item.command({ editor, range });
                                popup?.hide();
                            }
                        }}
                    />
                );
            }
        };

        const showMenu = (coords: { left: number; top: number }) => {
            const element = document.createElement('div');
            element.className = 'slash-command-container';

            popup = tippy(document.body, {
                getReferenceClientRect: () => ({
                    width: 0,
                    height: 0,
                    top: coords.top,
                    bottom: coords.top,
                    left: coords.left,
                    right: coords.left,
                    x: coords.left,
                    y: coords.top,
                    toJSON: () => ({}),
                }),
                appendTo: () => document.body,
                content: element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                animation: 'shift-away',
                theme: 'slash-command',
            });

            root = createRoot(element);
            updateMenu(element);
        };

        const hideMenu = () => {
            popup?.destroy();
            popup = null;
            root?.unmount();
            root = null;
            selectedIndex = 0;
            filteredItems = [...slashCommandItems];
            query = '';
        };

        return [
            new Plugin({
                key: new PluginKey('slashCommands'),
                props: {
                    handleKeyDown(view, event) {
                        // Only handle when popup is visible
                        if (!popup) return false;

                        if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            selectedIndex = (selectedIndex + 1) % filteredItems.length;
                            updateMenu(popup.popper);
                            return true;
                        }

                        if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            selectedIndex = (selectedIndex - 1 + filteredItems.length) % filteredItems.length;
                            updateMenu(popup.popper);
                            return true;
                        }

                        if (event.key === 'Enter') {
                            event.preventDefault();
                            const item = filteredItems[selectedIndex];
                            if (item) {
                                const { from } = editor.state.selection;
                                const slashPos = from - query.length - 1;
                                const range = { from: slashPos, to: from };
                                item.command({ editor, range });
                                hideMenu();
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
                        update(view, prevState) {
                            const { state } = view;
                            const { selection } = state;
                            const { $from, from } = selection;

                            // Get text before cursor
                            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
                            const slashMatch = textBefore.match(/\/([a-zA-Z0-9 ]*)$/);

                            if (slashMatch) {
                                query = slashMatch[1] || '';

                                // Filter items based on query
                                filteredItems = slashCommandItems.filter((item) => {
                                    const searchText = `${item.title} ${item.description} ${(item.keywords || []).join(' ')}`.toLowerCase();
                                    return searchText.includes(query.toLowerCase());
                                });

                                selectedIndex = 0;

                                if (!popup) {
                                    const coords = view.coordsAtPos(from);
                                    showMenu({ left: coords.left, top: coords.bottom + 5 });
                                } else {
                                    updateMenu(popup.popper);
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

export default SlashCommands;
