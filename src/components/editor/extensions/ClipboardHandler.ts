/**
 * ClipboardHandler Extension for TipTap
 * 
 * Enhances paste behavior to properly handle:
 * - HTML content (preserves formatting from web pages)
 * - Markdown content (converts to TipTap nodes)
 * - Plain URLs (auto-converts to links or bookmarks)
 * - Image URLs (auto-inserts as images)
 * - Code blocks (preserves language detection)
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// Common image URL patterns
const IMAGE_URL_REGEX = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|avif|bmp|ico)(\?.*)?$/i;
// Common video URL patterns
const VIDEO_URL_REGEX = /^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/|vimeo\.com\/)/i;
// General URL pattern
const URL_REGEX = /^https?:\/\/[^\s]+$/;

// Markdown to content conversion helpers
function isMarkdownContent(text: string): boolean {
    const mdPatterns = [
        /^#{1,6}\s/m,           // headings
        /^\s*[-*+]\s/m,         // unordered lists
        /^\s*\d+\.\s/m,         // ordered lists
        /^\s*>\s/m,             // blockquotes
        /\*\*[^*]+\*\*/,       // bold
        /\*[^*]+\*/,           // italic
        /`[^`]+`/,             // inline code
        /^```/m,               // code blocks
        /^\s*[-*]{3,}/m,       // horizontal rules
        /\[.+\]\(.+\)/,       // links
        /!\[.*\]\(.+\)/,      // images
        /^\s*\[[ x]\]/m,      // task items
    ];

    let matchCount = 0;
    for (const pattern of mdPatterns) {
        if (pattern.test(text)) {
            matchCount++;
        }
    }
    // Consider it markdown if 2+ patterns match
    return matchCount >= 2;
}

function markdownToHtml(md: string): string {
    let html = md;

    // Code blocks (must be first to avoid inner transforms)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang || ''}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headings
    html = html.replace(/^######\s(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s(.+)$/gm, '<h1>$1</h1>');

    // Bold & italic
    html = html.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Strikethrough
    html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Horizontal rules
    html = html.replace(/^[-*]{3,}$/gm, '<hr />');

    // Task lists
    html = html.replace(/^\s*\[x\]\s(.+)$/gm, '<ul data-type="taskList"><li data-checked="true"><p>$1</p></li></ul>');
    html = html.replace(/^\s*\[\s?\]\s(.+)$/gm, '<ul data-type="taskList"><li data-checked="false"><p>$1</p></li></ul>');

    // Unordered lists (simple - single level)
    html = html.replace(/^\s*[-*+]\s(.+)$/gm, '<li><p>$1</p></li>');
    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li><p>.*?<\/p><\/li>\n?)+)/g, '<ul>$1</ul>');

    // Ordered lists
    html = html.replace(/^\s*\d+\.\s(.+)$/gm, '<li><p>$1</p></li>');

    // Blockquotes
    html = html.replace(/^>\s(.+)$/gm, '<blockquote><p>$1</p></blockquote>');

    // Paragraphs (lines that aren't already wrapped in HTML)
    html = html.replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p>$1</p>');

    return html;
}

export const ClipboardHandler = Extension.create({
    name: 'clipboardHandler',

    addProseMirrorPlugins() {
        const editor = this.editor;

        return [
            new Plugin({
                key: new PluginKey('clipboardHandler'),
                props: {
                    handlePaste(view, event) {
                        const clipboardData = event.clipboardData;
                        if (!clipboardData) return false;

                        const htmlContent = clipboardData.getData('text/html');
                        const textContent = clipboardData.getData('text/plain').trim();

                        // If HTML content exists, let TipTap's default handler deal with it
                        // (it already handles HTML paste well)
                        if (htmlContent && htmlContent.length > 20) {
                            return false; // Let default handler process it
                        }

                        // Plain text handling
                        if (!textContent) return false;

                        // 1. Check if it's a single image URL - auto-insert as image
                        if (IMAGE_URL_REGEX.test(textContent)) {
                            event.preventDefault();
                            editor.chain().focus().setImage({ src: textContent }).run();
                            return true;
                        }

                        // 2. Check if it's a video URL - auto-insert as video node
                        if (VIDEO_URL_REGEX.test(textContent)) {
                            event.preventDefault();
                            editor.chain().focus().insertContent({
                                type: 'video',
                                attrs: { src: textContent },
                            }).run();
                            return true;
                        }

                        // 3. Check if it's a single URL - auto-convert to link
                        if (URL_REGEX.test(textContent) && !textContent.includes('\n')) {
                            event.preventDefault();
                            // If text is selected, turn it into a link
                            const { from, to } = view.state.selection;
                            if (from !== to) {
                                editor.chain().focus().setLink({ href: textContent }).run();
                            } else {
                                // Insert as clickable link text
                                editor.chain().focus().insertContent([
                                    {
                                        type: 'text',
                                        marks: [{ type: 'link', attrs: { href: textContent } }],
                                        text: textContent,
                                    },
                                ]).run();
                            }
                            return true;
                        }

                        // 4. Check if it's markdown content - convert to rich text
                        if (isMarkdownContent(textContent)) {
                            event.preventDefault();
                            const html = markdownToHtml(textContent);
                            editor.chain().focus().insertContent(html).run();
                            return true;
                        }

                        // 5. Default: let TipTap handle the plain text paste
                        return false;
                    },

                    // Handle drop events for media URLs
                    handleDrop(view, event) {
                        const text = event.dataTransfer?.getData('text/plain')?.trim();
                        if (!text) return false;

                        // Image URL drop
                        if (IMAGE_URL_REGEX.test(text)) {
                            event.preventDefault();
                            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
                            if (coords) {
                                editor.chain().focus().setTextSelection(coords.pos).setImage({ src: text }).run();
                            }
                            return true;
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});

export default ClipboardHandler;
