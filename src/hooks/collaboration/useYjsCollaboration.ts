/**
 * useYjsCollaboration - React hook for Yjs collaborative editing
 * 
 * This hook initializes a Yjs document and provider for real-time collaboration.
 * It integrates with the BlockEditor component for PRD editing.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { YjsSupabaseProvider, type YjsSupabaseProviderOptions } from '@/lib/collaboration';

type SyncStatus = 'connecting' | 'connected' | 'disconnected' | 'synced';

interface UseYjsCollaborationOptions {
    documentId: string;
    documentType: 'prd' | 'issue';
    teamId: string;
    userId: string;
    userName: string;
    userColor?: string;
    avatarUrl?: string;
    enabled?: boolean;
    initialContent?: string;
    onContentChange?: (content: string) => void;
}

interface UseYjsCollaborationReturn {
    yjsDoc: Y.Doc | null;
    provider: YjsSupabaseProvider | null;
    status: SyncStatus;
    isConnected: boolean;
    isSynced: boolean;
    getContent: () => string;
    setContent: (content: string) => void;
}

export function useYjsCollaboration(options: UseYjsCollaborationOptions): UseYjsCollaborationReturn {
    const {
        documentId,
        documentType,
        teamId,
        userId,
        userName,
        userColor,
        avatarUrl,
        enabled = true,
        initialContent = '',
        onContentChange,
    } = options;

    const [status, setStatus] = useState<SyncStatus>('disconnected');
    const docRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<YjsSupabaseProvider | null>(null);
    const xmlFragmentRef = useRef<Y.XmlFragment | null>(null);
    const initializedRef = useRef(false);

    // Initialize Yjs document and provider
    useEffect(() => {
        if (!enabled || !documentId || !teamId || !userId || initializedRef.current) {
            return;
        }

        // Create the Yjs document
        const doc = new Y.Doc();
        docRef.current = doc;

        // Get the XML fragment for Tiptap
        const xmlFragment = doc.getXmlFragment('prosemirror');
        xmlFragmentRef.current = xmlFragment;

        // Create the Supabase provider
        const providerOptions: YjsSupabaseProviderOptions = {
            documentId,
            documentType,
            teamId,
            userId,
            userName,
            userColor,
            avatarUrl,
        };

        const provider = new YjsSupabaseProvider(doc, providerOptions);
        providerRef.current = provider;

        // Listen for status changes
        const unsubscribe = provider.onStatus(setStatus);

        // Set initial content if document is empty after sync
        const handleSync = () => {
            if (xmlFragment.length === 0 && initialContent) {
                // Document is empty, set initial content
                // Note: For proper HTML to Yjs conversion, use ProseMirror schema
                // This is a simplified version
                console.log('[YjsCollaboration] Setting initial content');
            }
        };

        // Listen for document changes
        const handleUpdate = () => {
            if (onContentChange) {
                const content = getXmlContent(xmlFragment);
                onContentChange(content);
            }
        };

        doc.on('update', handleUpdate);

        initializedRef.current = true;

        return () => {
            unsubscribe();
            doc.off('update', handleUpdate);
            provider.destroy();
            doc.destroy();
            docRef.current = null;
            providerRef.current = null;
            xmlFragmentRef.current = null;
            initializedRef.current = false;
        };
    }, [enabled, documentId, documentType, teamId, userId, userName, userColor, avatarUrl, initialContent, onContentChange]);

    // Get content from XML fragment
    const getContent = useCallback((): string => {
        if (!xmlFragmentRef.current) return '';
        return getXmlContent(xmlFragmentRef.current);
    }, []);

    // Set content to XML fragment (for initial content or AI suggestions)
    const setContent = useCallback((content: string) => {
        if (!docRef.current || !xmlFragmentRef.current) return;

        // Note: For proper HTML to Yjs conversion, this needs ProseMirror integration
        // The BlockEditor's Collaboration extension handles this automatically
        console.log('[YjsCollaboration] setContent called, handled by Tiptap');
    }, []);

    return {
        yjsDoc: docRef.current,
        provider: providerRef.current,
        status,
        isConnected: status === 'connected' || status === 'synced',
        isSynced: status === 'synced',
        getContent,
        setContent,
    };
}

// Helper function to extract content from XML fragment
function getXmlContent(xmlFragment: Y.XmlFragment): string {
    // This is a simplified extraction - actual content comes from Tiptap editor
    try {
        const elements: string[] = [];
        xmlFragment.forEach((item) => {
            if (item instanceof Y.XmlElement) {
                elements.push(item.toString());
            } else if (item instanceof Y.XmlText) {
                elements.push(item.toString());
            }
        });
        return elements.join('');
    } catch {
        return '';
    }
}
