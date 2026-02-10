/**
 * CodeBlock with Language Selector
 * 
 * Extends CodeBlockLowlight with a language dropdown UI.
 * Shows a select menu at the top-right of code blocks
 * for choosing the syntax highlighting language.
 */

import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import React, { useCallback } from 'react';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';

const lowlight = createLowlight(common);

// Languages supported by lowlight/common
const LANGUAGES = [
    { value: '', label: 'Auto-detect' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'jsx', label: 'JSX' },
    { value: 'tsx', label: 'TSX' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'php', label: 'PHP' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'scss', label: 'SCSS' },
    { value: 'json', label: 'JSON' },
    { value: 'yaml', label: 'YAML' },
    { value: 'xml', label: 'XML' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'sql', label: 'SQL' },
    { value: 'graphql', label: 'GraphQL' },
    { value: 'bash', label: 'Bash' },
    { value: 'shell', label: 'Shell' },
    { value: 'dockerfile', label: 'Dockerfile' },
    { value: 'diff', label: 'Diff' },
    { value: 'plaintext', label: 'Plain Text' },
];

const CodeBlockComponent: React.FC<NodeViewProps> = ({
    node,
    updateAttributes,
    selected,
    extension,
}) => {
    const language = node.attrs.language || '';
    const displayLang = LANGUAGES.find(l => l.value === language)?.label || language || 'Auto-detect';

    const handleLanguageChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        updateAttributes({ language: e.target.value || null });
    }, [updateAttributes]);

    const handleCopy = useCallback(() => {
        const code = node.textContent;
        navigator.clipboard.writeText(code);
    }, [node]);

    return (
        <NodeViewWrapper className="relative my-4 group">
            <div className={`rounded-lg overflow-hidden border ${selected ? 'ring-2 ring-primary/50' : 'border-white/10'}`}>
                {/* Header bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0c] border-b border-white/5">
                    {/* Language selector */}
                    <select
                        value={language}
                        onChange={handleLanguageChange}
                        className="bg-transparent text-xs text-slate-400 border-none focus:outline-none cursor-pointer hover:text-white transition-colors appearance-none pr-4"
                        contentEditable={false}
                    >
                        {LANGUAGES.map(lang => (
                            <option key={lang.value} value={lang.value} className="bg-[#1a1a1f] text-white">
                                {lang.label}
                            </option>
                        ))}
                    </select>

                    {/* Copy button */}
                    <button
                        onClick={handleCopy}
                        className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
                        contentEditable={false}
                    >
                        Copy
                    </button>
                </div>

                {/* Code content */}
                <pre className="!m-0 !rounded-none bg-[#121215]">
                    <NodeViewContent
                        as="code"
                        className={`!p-4 block font-mono text-sm language-${language}`}
                    />
                </pre>
            </div>
        </NodeViewWrapper>
    );
};

/**
 * Extended CodeBlockLowlight with language selector UI
 */
export const CodeBlockWithLanguage = CodeBlockLowlight.extend({
    addNodeView() {
        return ReactNodeViewRenderer(CodeBlockComponent);
    },
});

export { lowlight };
export default CodeBlockWithLanguage;
