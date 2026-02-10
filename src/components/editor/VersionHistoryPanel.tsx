import React, { useState } from 'react';
import { History, RotateCcw, Eye, Clock, FileText, ChevronDown, X } from 'lucide-react';
import type { PageVersion } from '@/hooks/usePageHistory';

interface VersionHistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    versions: PageVersion[];
    isLoading: boolean;
    viewingVersion: PageVersion | null;
    onViewVersion: (versionId: string) => void;
    onRestoreVersion: (versionId: string) => Promise<void>;
    onClearViewing: () => void;
}

export function VersionHistoryPanel({
    isOpen,
    onClose,
    versions,
    isLoading,
    viewingVersion,
    onViewVersion,
    onRestoreVersion,
    onClearViewing,
}: VersionHistoryPanelProps) {
    const [restoring, setRestoring] = useState<string | null>(null);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = diff / 3600000;
        const days = diff / 86400000;

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) > 1 ? 's' : ''} ago`;
        if (days < 7) return `${Math.floor(days)} day${Math.floor(days) > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleRestore = async (versionId: string) => {
        setRestoring(versionId);
        try {
            await onRestoreVersion(versionId);
        } finally {
            setRestoring(null);
        }
    };

    const groupVersionsByDate = (versions: PageVersion[]) => {
        const groups: { [key: string]: PageVersion[] } = {};

        versions.forEach((version) => {
            const date = new Date(version.createdAt);
            const key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(version);
        });

        return groups;
    };

    const groupedVersions = groupVersionsByDate(versions);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Panel */}
            <div className="relative ml-auto w-[400px] bg-[#0d0d0f] border-l flex flex-col h-full">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        <h2 className="font-semibold">Version History</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/5 rounded">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Viewing Version Banner */}
                {viewingVersion && (
                    <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-600">
                            <Eye className="h-4 w-4" />
                            <span className="text-sm font-medium">Viewing past version</span>
                        </div>
                        <button
                            onClick={onClearViewing}
                            className="text-xs px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded"
                        >
                            Back to current
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No version history yet</p>
                            <p className="text-xs mt-1">Changes will be saved automatically</p>
                        </div>
                    ) : (
                        Object.entries(groupedVersions).map(([date, dateVersions]) => (
                            <div key={date} className="mb-6">
                                <h3 className="text-xs font-medium text-slate-400 mb-2">{date}</h3>
                                <div className="space-y-2">
                                    {dateVersions.map((version) => (
                                        <div
                                            key={version.id}
                                            className={`p-3 rounded-lg border transition-colors ${viewingVersion?.id === version.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-white/10 hover:border-primary/50'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">
                                                            {new Date(version.createdAt).toLocaleTimeString('en-US', {
                                                                hour: 'numeric',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                        {version.isAutoSave && (
                                                            <span className="text-[10px] px-1.5 py-0.5 bg-[#121215] rounded text-slate-400">
                                                                Auto-save
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {version.authorName} · {version.wordCount} words
                                                    </p>
                                                    {version.changeDescription && (
                                                        <p className="text-xs mt-1 text-white/70">
                                                            {version.changeDescription}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => onViewVersion(version.id)}
                                                        className="p-1.5 hover:bg-white/5 rounded text-slate-400 hover:text-white"
                                                        title="View this version"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRestore(version.id)}
                                                        disabled={restoring === version.id}
                                                        className="p-1.5 hover:bg-white/5 rounded text-slate-400 hover:text-white disabled:opacity-50"
                                                        title="Restore this version"
                                                    >
                                                        <RotateCcw className={`h-3.5 w-3.5 ${restoring === version.id ? 'animate-spin' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t text-xs text-slate-400 text-center">
                    Versions are automatically saved every 5 minutes
                </div>
            </div>
        </div>
    );
}

export default VersionHistoryPanel;
