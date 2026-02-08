/**
 * Markdown to Tiptap HTML Converter
 * 
 * Converts markdown content from Lily AI (or paste) to proper Tiptap-compatible HTML.
 * This ensures content renders as Notion-style blocks instead of raw markdown.
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Convert markdown to Tiptap-compatible HTML
 */
export function markdownToHTML(markdown: string): string {
    if (!markdown) return '';

    // If it's already HTML (starts with < or contains HTML tags), return as-is
    if (markdown.trim().startsWith('<') || /<[a-z][\s\S]*>/i.test(markdown)) {
        return markdown;
    }

    // Configure marked for Tiptap compatibility
    marked.setOptions({
        breaks: true, // Convert line breaks to <br>
        gfm: true, // GitHub Flavored Markdown
    });

    // Convert markdown to HTML
    let html = marked.parse(markdown) as string;

    // Post-process for Tiptap block compatibility
    html = postProcessForTiptap(html);

    // Sanitize to prevent XSS
    html = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'blockquote',
            'a', 'img',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'hr', 'span', 'div',
            'input', // for checkboxes
        ],
        ALLOWED_ATTR: [
            'href', 'src', 'alt', 'title', 'class', 'id',
            'target', 'rel',
            'type', 'checked', 'disabled', // for checkboxes
            'data-type', 'data-checked', // for Tiptap task lists
        ],
    });

    return html;
}

/**
 * Post-process HTML for Tiptap compatibility
 */
function postProcessForTiptap(html: string): string {
    // Convert GitHub-style task lists to Tiptap format
    // [ ] -> unchecked, [x] -> checked
    html = html.replace(
        /<li>\s*\[ \]/g,
        '<li data-type="taskItem" data-checked="false">'
    );
    html = html.replace(
        /<li>\s*\[x\]/gi,
        '<li data-type="taskItem" data-checked="true">'
    );

    // Wrap task list items in proper ul
    html = html.replace(
        /<ul>\s*(<li data-type="taskItem")/g,
        '<ul data-type="taskList">$1'
    );

    // Ensure code blocks have language class
    html = html.replace(
        /<pre><code class="language-(\w+)">/g,
        '<pre><code class="hljs language-$1">'
    );

    // Add target="_blank" to external links
    html = html.replace(
        /<a href="(https?:\/\/[^"]+)">/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">'
    );

    return html;
}

/**
 * Check if content is markdown (not HTML)
 */
export function isMarkdown(content: string): boolean {
    if (!content) return false;

    // If it starts with HTML tag, it's not markdown
    if (content.trim().startsWith('<')) return false;

    // Check for common markdown patterns
    const markdownPatterns = [
        /^#+\s+/m, // Headers
        /^\s*[-*+]\s+/m, // Unordered lists
        /^\s*\d+\.\s+/m, // Ordered lists
        /^\s*>\s+/m, // Blockquotes
        /\*\*.+\*\*/m, // Bold
        /__.+__/m, // Bold
        /\*.+\*/m, // Italic (but not **)
        /_.+_/m, // Italic (but not __)
        /`[^`]+`/m, // Inline code
        /```[\s\S]*```/m, // Code blocks
        /\[.+\]\(.+\)/m, // Links
        /!\[.+\]\(.+\)/m, // Images
        /^\s*---+\s*$/m, // Horizontal rules
        /^\s*\|\s*.+\s*\|/m, // Tables
        /\[ \]|\[x\]/i, // Task lists
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
}

/**
 * Auto-convert content: if markdown, convert to HTML; otherwise return as-is
 */
export function autoConvertContent(content: string): string {
    if (isMarkdown(content)) {
        return markdownToHTML(content);
    }
    return content;
}

export default {
    markdownToHTML,
    isMarkdown,
    autoConvertContent,
};
