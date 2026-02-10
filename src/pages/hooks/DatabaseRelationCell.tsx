import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, Link2, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database, DatabaseRow, DatabaseProperty } from './databaseTypes';

interface DatabaseRelationCellProps {
    value: string[];  // Array of related row IDs
    property: DatabaseProperty;
    relatedDatabase: Database | null;
    onUpdate: (value: unknown) => void;
}

export function DatabaseRelationCell({
    value,
    property,
    relatedDatabase,
    onUpdate,
}: DatabaseRelationCellProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const selectedIds = value || [];

    // Find the title property of the related database
    const titleProp = relatedDatabase?.properties.find(
        p => p.name.toLowerCase() === 'title' || p.name.toLowerCase() === 'name'
    ) || relatedDatabase?.properties.find(p => p.type === 'text') || relatedDatabase?.properties[0];

    // Get display name for a related row
    const getRowTitle = (rowId: string) => {
        if (!relatedDatabase || !titleProp) return rowId;
        const row = relatedDatabase.rows.find(r => r.id === rowId);
        return (row?.properties[titleProp.id] as string) || 'Untitled';
    };

    // Filter related rows by search
    const filteredRelatedRows = useMemo(() => {
        if (!relatedDatabase) return [];
        if (!searchQuery) return relatedDatabase.rows;
        return relatedDatabase.rows.filter(row => {
            const title = titleProp ? (row.properties[titleProp.id] as string) || '' : '';
            return title.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [relatedDatabase, searchQuery, titleProp]);

    const toggleRow = (rowId: string) => {
        if (selectedIds.includes(rowId)) {
            const newVal = selectedIds.filter(id => id !== rowId);
            onUpdate(newVal.length > 0 ? newVal : null);
        } else {
            onUpdate([...selectedIds, rowId]);
        }
    };

    const removeRelation = (rowId: string) => {
        const newVal = selectedIds.filter(id => id !== rowId);
        onUpdate(newVal.length > 0 ? newVal : null);
    };

    if (!relatedDatabase) {
        return (
            <div className="min-h-[32px] flex items-center px-1 text-sm text-slate-500">
                <Link2 className="h-3.5 w-3.5 mr-1.5" />
                No linked database
            </div>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="min-h-[32px] flex items-center gap-1 px-1 cursor-pointer rounded hover:bg-white/5 transition-colors flex-wrap">
                    {selectedIds.length > 0 ? (
                        selectedIds.map(id => (
                            <Badge
                                key={id}
                                variant="outline"
                                className="text-xs gap-1 group/badge"
                            >
                                <Link2 className="h-3 w-3 text-slate-400" />
                                {getRowTitle(id)}
                                <button
                                    className="opacity-0 group-hover/badge:opacity-100"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        removeRelation(id);
                                    }}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))
                    ) : (
                        <span className="text-sm text-slate-500">
                            <Link2 className="h-3.5 w-3.5 inline mr-1" />
                            Add relation
                        </span>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
                {/* Search */}
                <div className="p-2 border-b border-white/10">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search in ${relatedDatabase.name}...`}
                            className="h-8 pl-8 text-xs bg-transparent"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Row list */}
                <ScrollArea className="max-h-[250px]">
                    <div className="p-1">
                        {filteredRelatedRows.length === 0 ? (
                            <div className="text-center text-slate-500 text-xs py-4">No rows found</div>
                        ) : (
                            filteredRelatedRows.map(row => {
                                const isSelected = selectedIds.includes(row.id);
                                const title = titleProp ? (row.properties[titleProp.id] as string) || 'Untitled' : 'Untitled';

                                return (
                                    <button
                                        key={row.id}
                                        onClick={() => toggleRow(row.id)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                                            "hover:bg-white/5",
                                            isSelected && "bg-white/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                                            isSelected ? "bg-primary border-primary" : "border-white/20"
                                        )}>
                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                        </div>
                                        <span className="truncate">{title}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-2 border-t border-white/10 text-xs text-slate-400">
                    {selectedIds.length} linked from {relatedDatabase.name}
                </div>
            </PopoverContent>
        </Popover>
    );
}
