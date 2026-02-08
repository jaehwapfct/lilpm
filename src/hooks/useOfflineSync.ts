import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

/**
 * Custom hook for offline Yjs document persistence using IndexedDB
 * Enables offline editing and automatic sync when back online
 */
export interface UseOfflineSyncOptions {
    /** Unique identifier for the document (e.g., PRD ID) */
    documentId: string;
    /** The Yjs document to persist */
    yjsDoc: Y.Doc | null;
    /** Optional callback when sync status changes */
    onSyncStatusChange?: (status: 'syncing' | 'synced' | 'error') => void;
}

export interface UseOfflineSyncReturn {
    /** Whether the document is currently syncing with IndexedDB */
    isSyncing: boolean;
    /** Whether initial sync from IndexedDB is complete */
    isSynced: boolean;
    /** Any error that occurred during sync */
    error: Error | null;
    /** Manually trigger a sync */
    forceSync: () => Promise<void>;
    /** Clear persisted data for this document */
    clearPersistedData: () => Promise<void>;
}

export function useOfflineSync({
    documentId,
    yjsDoc,
    onSyncStatusChange,
}: UseOfflineSyncOptions): UseOfflineSyncReturn {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSynced, setIsSynced] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const persistenceRef = useRef<IndexeddbPersistence | null>(null);

    useEffect(() => {
        if (!documentId || !yjsDoc) {
            return;
        }

        // Create IndexedDB persistence
        const dbName = `lilpm-doc-${documentId}`;

        try {
            setIsSyncing(true);
            onSyncStatusChange?.('syncing');

            const persistence = new IndexeddbPersistence(dbName, yjsDoc);
            persistenceRef.current = persistence;

            // Handle sync completion
            persistence.on('synced', () => {
                setIsSynced(true);
                setIsSyncing(false);
                setError(null);
                onSyncStatusChange?.('synced');
                console.log(`[OfflineSync] Document ${documentId} synced with IndexedDB`);
            });

            // Handle errors (IndexeddbPersistence doesn't emit 'error' but we catch init errors)
        } catch (err) {
            const syncError = err instanceof Error ? err : new Error('Unknown sync error');
            setError(syncError);
            setIsSyncing(false);
            onSyncStatusChange?.('error');
            console.error(`[OfflineSync] Error initializing persistence for ${documentId}:`, err);
        }

        return () => {
            // Clean up persistence on unmount
            if (persistenceRef.current) {
                persistenceRef.current.destroy();
                persistenceRef.current = null;
            }
        };
    }, [documentId, yjsDoc, onSyncStatusChange]);

    const forceSync = async (): Promise<void> => {
        if (!persistenceRef.current) {
            throw new Error('Persistence not initialized');
        }

        // IndexedDB persistence automatically syncs, but we can manually flush
        // by waiting for the whenSynced promise
        setIsSyncing(true);
        onSyncStatusChange?.('syncing');

        try {
            await persistenceRef.current.whenSynced;
            setIsSynced(true);
            setIsSyncing(false);
            onSyncStatusChange?.('synced');
        } catch (err) {
            const syncError = err instanceof Error ? err : new Error('Sync failed');
            setError(syncError);
            setIsSyncing(false);
            onSyncStatusChange?.('error');
        }
    };

    const clearPersistedData = async (): Promise<void> => {
        const dbName = `lilpm-doc-${documentId}`;

        // Destroy current persistence
        if (persistenceRef.current) {
            persistenceRef.current.destroy();
            persistenceRef.current = null;
        }

        // Delete the IndexedDB database
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(dbName);
            request.onsuccess = () => {
                console.log(`[OfflineSync] Cleared persisted data for ${documentId}`);
                setIsSynced(false);
                resolve();
            };
            request.onerror = () => {
                reject(new Error('Failed to delete IndexedDB database'));
            };
        });
    };

    return {
        isSyncing,
        isSynced,
        error,
        forceSync,
        clearPersistedData,
    };
}

export default useOfflineSync;
