import { useState, useEffect, useCallback } from 'react';

/**
 * Page Version History Hook
 * Tracks document versions and enables restoration to previous states
 */

export interface PageVersion {
    id: string;
    pageId: string;
    pageType: 'prd' | 'issue';
    content: string;
    title: string;
    authorId: string;
    authorName: string;
    createdAt: string;
    changeDescription?: string;
    wordCount: number;
    isAutoSave: boolean;
}

export interface UsePageHistoryOptions {
    pageId: string;
    pageType: 'prd' | 'issue';
    supabaseClient: any;
    currentContent?: string;
    onRestore?: (content: string) => void;
}

export interface UsePageHistoryReturn {
    /** All versions for this page */
    versions: PageVersion[];
    /** Whether versions are loading */
    isLoading: boolean;
    /** Current version being viewed (null = latest) */
    viewingVersion: PageVersion | null;
    /** Fetch all versions */
    fetchVersions: () => Promise<void>;
    /** Save a new version */
    saveVersion: (content: string, title: string, authorId: string, authorName: string, changeDescription?: string, isAutoSave?: boolean) => Promise<void>;
    /** View a specific version */
    viewVersion: (versionId: string) => void;
    /** Restore to a specific version */
    restoreVersion: (versionId: string) => Promise<void>;
    /** Compare two versions */
    compareVersions: (versionId1: string, versionId2: string) => { added: number; removed: number } | null;
    /** Clear viewing state */
    clearViewing: () => void;
}

export function usePageHistory({
    pageId,
    pageType,
    supabaseClient,
    currentContent,
    onRestore,
}: UsePageHistoryOptions): UsePageHistoryReturn {
    const [versions, setVersions] = useState<PageVersion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [viewingVersion, setViewingVersion] = useState<PageVersion | null>(null);

    const tableName = pageType === 'prd' ? 'prd_versions' : 'issue_versions';

    const fetchVersions = useCallback(async () => {
        if (!pageId || !supabaseClient) return;

        setIsLoading(true);
        try {
            const { data, error } = await supabaseClient
                .from(tableName)
                .select('*')
                .eq('page_id', pageId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('[PageHistory] Failed to fetch versions:', error);
                return;
            }

            const formattedVersions: PageVersion[] = (data || []).map((row: any) => ({
                id: row.id,
                pageId: row.page_id,
                pageType,
                content: row.content,
                title: row.title,
                authorId: row.author_id,
                authorName: row.author_name || 'Unknown',
                createdAt: row.created_at,
                changeDescription: row.change_description,
                wordCount: row.word_count || 0,
                isAutoSave: row.is_auto_save || false,
            }));

            setVersions(formattedVersions);
        } catch (err) {
            console.error('[PageHistory] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [pageId, pageType, supabaseClient, tableName]);

    useEffect(() => {
        fetchVersions();
    }, [fetchVersions]);

    const saveVersion = async (
        content: string,
        title: string,
        authorId: string,
        authorName: string,
        changeDescription?: string,
        isAutoSave = false
    ) => {
        if (!pageId || !supabaseClient) return;

        // Count words
        const wordCount = content.split(/\s+/).filter(Boolean).length;

        try {
            const { error } = await supabaseClient
                .from(tableName)
                .insert({
                    page_id: pageId,
                    content,
                    title,
                    author_id: authorId,
                    author_name: authorName,
                    change_description: changeDescription,
                    word_count: wordCount,
                    is_auto_save: isAutoSave,
                });

            if (error) {
                console.error('[PageHistory] Failed to save version:', error);
                return;
            }

            // Refresh versions list
            await fetchVersions();
            console.log(`[PageHistory] Version saved for ${pageType} ${pageId}`);
        } catch (err) {
            console.error('[PageHistory] Save error:', err);
        }
    };

    const viewVersion = (versionId: string) => {
        const version = versions.find(v => v.id === versionId);
        setViewingVersion(version || null);
    };

    const restoreVersion = async (versionId: string) => {
        const version = versions.find(v => v.id === versionId);
        if (!version) {
            console.error('[PageHistory] Version not found:', versionId);
            return;
        }

        // Call onRestore callback with the content
        onRestore?.(version.content);

        // Save this restoration as a new version
        await saveVersion(
            version.content,
            version.title,
            version.authorId,
            version.authorName,
            `Restored from version ${new Date(version.createdAt).toLocaleString()}`
        );

        setViewingVersion(null);
    };

    const compareVersions = (versionId1: string, versionId2: string) => {
        const v1 = versions.find(v => v.id === versionId1);
        const v2 = versions.find(v => v.id === versionId2);

        if (!v1 || !v2) return null;

        const words1 = new Set(v1.content.split(/\s+/));
        const words2 = new Set(v2.content.split(/\s+/));

        let added = 0;
        let removed = 0;

        words2.forEach(word => {
            if (!words1.has(word)) added++;
        });

        words1.forEach(word => {
            if (!words2.has(word)) removed++;
        });

        return { added, removed };
    };

    const clearViewing = () => {
        setViewingVersion(null);
    };

    return {
        versions,
        isLoading,
        viewingVersion,
        fetchVersions,
        saveVersion,
        viewVersion,
        restoreVersion,
        compareVersions,
        clearViewing,
    };
}

export default usePageHistory;
