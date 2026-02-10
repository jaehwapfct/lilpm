import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';

interface TimelineThinkingBlockProps {
    content: string;
    isExpanded?: boolean;
}

/**
 * Timeline Thinking Block Component (like Gemini/Claude)
 * Shows AI thinking process in a collapsible timeline format
 */
export function TimelineThinkingBlock({ content, isExpanded = false }: TimelineThinkingBlockProps) {
    const [expanded, setExpanded] = useState(isExpanded);

    if (!content) return null;

    return (
        <div className="flex gap-2 mb-3">
            <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                </div>
                <div className="w-px flex-1 bg-border" />
            </div>
            <div className="flex-1 pb-2">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 text-xs text-amber-600 hover:text-amber-500 font-medium mb-1"
                >
                    {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    Thinking...
                </button>
                {expanded && (
                    <div className="text-xs text-slate-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-2 mt-1">
                        {content}
                    </div>
                )}
            </div>
        </div>
    );
}

export default TimelineThinkingBlock;
