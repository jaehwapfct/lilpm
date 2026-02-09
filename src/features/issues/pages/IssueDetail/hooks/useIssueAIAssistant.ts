// AI Assistant logic for Issue Detail Page
import { useState, useEffect, useCallback } from 'react';
import type { AIProvider } from '@/types';
import type { Issue } from '@/types/database';
import { userAISettingsService } from '@/lib/services/conversationService';

interface AIMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface UseIssueAIAssistantProps {
    issue: Issue | null;
    userId?: string;
}

export interface UseIssueAIAssistantReturn {
    showAIPanel: boolean;
    aiMessages: AIMessage[];
    aiInput: string;
    isAILoading: boolean;
    selectedProvider: AIProvider;
    availableProviders: AIProvider[];
    providerLabels: Record<AIProvider, string>;

    setShowAIPanel: (show: boolean) => void;
    setAiInput: (input: string) => void;
    setSelectedProvider: (provider: AIProvider) => void;
    handleAISend: () => Promise<void>;
}

export function useIssueAIAssistant({
    issue,
    userId,
}: UseIssueAIAssistantProps): UseIssueAIAssistantReturn {
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
    const [aiInput, setAiInput] = useState('');
    const [isAILoading, setIsAILoading] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('anthropic');
    const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([]);

    const providerLabels: Record<AIProvider, string> = {
        auto: '✨ Auto',
        anthropic: '🟣 Claude',
        openai: '🟢 GPT-4o',
        gemini: '🔵 Gemini',
    };

    // Fetch available AI providers on mount
    useEffect(() => {
        async function fetchProviders() {
            if (userId) {
                try {
                    const providers = await userAISettingsService.getAvailableProviders();
                    setAvailableProviders(providers.length > 0 ? providers : ['anthropic']);
                    const settings = await userAISettingsService.getSettings();
                    if (settings?.default_provider && providers.includes(settings.default_provider)) {
                        setSelectedProvider(settings.default_provider);
                    } else if (providers.length > 0) {
                        setSelectedProvider(providers[0]);
                    }
                } catch (error) {
                    console.error('Failed to fetch AI providers:', error);
                    setAvailableProviders(['anthropic']);
                }
            }
        }
        fetchProviders();
    }, [userId]);

    const handleAISend = useCallback(async () => {
        if (!aiInput.trim() || isAILoading || !issue) return;

        const userMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: aiInput.trim(),
            timestamp: new Date(),
        };
        setAiMessages(prev => [...prev, userMessage]);
        const userQuery = aiInput.trim();
        setAiInput('');
        setIsAILoading(true);

        const assistantMessageId = (Date.now() + 1).toString();
        setAiMessages(prev => [...prev, {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
        }]);

        try {
            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lbzjnhlribtfwnoydpdv.supabase.co';
            const response = await fetch(`${SUPABASE_URL}/functions/v1/lily-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'system',
                            content: `You are an issue editing assistant. Help the user with their issue.
              
Current Issue:
- Title: ${issue.title}
- Description: ${issue.description || 'No description'}
- Status: ${issue.status}
- Priority: ${issue.priority}
- Type: ${(issue as any).type || 'task'}

Help the user understand the issue, suggest improvements, or answer questions about it.
Respond in the same language as the user's message.`
                        },
                        ...aiMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
                        { role: 'user', content: userQuery }
                    ],
                    provider: selectedProvider,
                    stream: true,
                }),
            });

            if (!response.ok) throw new Error(`API error: ${response.status}`);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                const delta = parsed.choices?.[0]?.delta?.content ||
                                    parsed.delta?.text ||
                                    parsed.content ||
                                    parsed.text || '';
                                if (delta) {
                                    fullContent += delta;
                                    setAiMessages(prev => prev.map(m =>
                                        m.id === assistantMessageId ? { ...m, content: fullContent } : m
                                    ));
                                }
                            } catch {
                                if (line.trim() && !line.startsWith(':')) {
                                    fullContent += data;
                                    setAiMessages(prev => prev.map(m =>
                                        m.id === assistantMessageId ? { ...m, content: fullContent } : m
                                    ));
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('AI request failed:', error);
            setAiMessages(prev => prev.map(m =>
                m.id === assistantMessageId ? {
                    ...m,
                    content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                } : m
            ));
        } finally {
            setIsAILoading(false);
        }
    }, [aiInput, isAILoading, issue, aiMessages, selectedProvider]);

    return {
        showAIPanel,
        aiMessages,
        aiInput,
        isAILoading,
        selectedProvider,
        availableProviders,
        providerLabels,
        setShowAIPanel,
        setAiInput,
        setSelectedProvider,
        handleAISend,
    };
}
