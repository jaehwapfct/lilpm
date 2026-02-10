import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Copy, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DatabaseRow, DatabaseProperty } from './databaseTypes';

interface DatabaseGalleryViewProps {
    rows: DatabaseRow[];
    properties: DatabaseProperty[];
    visibleProperties?: string[];
    onRowClick: (row: DatabaseRow) => void;
    onAddRow: () => void;
    onDeleteRow: (rowId: string) => void;
    onDuplicateRow: (rowId: string) => void;
}

export function DatabaseGalleryView({
    rows,
    properties,
    visibleProperties,
    onRowClick,
    onAddRow,
    onDeleteRow,
    onDuplicateRow,
}: DatabaseGalleryViewProps) {
    // Find title property
    const titleProperty = properties.find(p => p.name.toLowerCase() === 'title' || p.name.toLowerCase() === 'name')
        || properties.find(p => p.type === 'text')
        || properties[0];

    // Properties to display on cards (excluding title)
    const displayProperties = properties
        .filter(p => p.id !== titleProperty?.id)
        .filter(p => !visibleProperties || visibleProperties.includes(p.id))
        .slice(0, 4);

    // Get a color for the card based on first select/status property
    const getCardColor = (row: DatabaseRow) => {
        const selectProp = properties.find(p => p.type === 'select' || p.type === 'status');
        if (!selectProp) return '#3b82f6';
        const val = row.properties[selectProp.id];
        const option = selectProp.options?.find(o => o.id === val);
        return option?.color || '#3b82f6';
    };

    const renderPropertyValue = (row: DatabaseRow, prop: DatabaseProperty) => {
        const value = row.properties[prop.id];
        if (value === null || value === undefined || value === '') return null;

        switch (prop.type) {
            case 'select':
            case 'status': {
                const option = prop.options?.find(o => o.id === value);
                return option ? (
                    <Badge
                        style={{ backgroundColor: option.color + '20', color: option.color, borderColor: option.color }}
                        variant="outline"
                        className="text-[10px] h-5"
                    >
                        {option.name}
                    </Badge>
                ) : null;
            }
            case 'multi_select': {
                const ids = (value as string[]) || [];
                const selected = prop.options?.filter(o => ids.includes(o.id)) || [];
                return (
                    <div className="flex gap-0.5 flex-wrap">
                        {selected.slice(0, 2).map(option => (
                            <Badge
                                key={option.id}
                                style={{ backgroundColor: option.color + '20', color: option.color, borderColor: option.color }}
                                variant="outline"
                                className="text-[10px] h-5"
                            >
                                {option.name}
                            </Badge>
                        ))}
                        {selected.length > 2 && (
                            <span className="text-[10px] text-slate-500">+{selected.length - 2}</span>
                        )}
                    </div>
                );
            }
            case 'date': {
                try {
                    const d = new Date(value as string);
                    if (isNaN(d.getTime())) return null;
                    return <span className="text-xs text-slate-400">{format(d, 'MMM d, yyyy')}</span>;
                } catch { return null; }
            }
            case 'checkbox':
                return <span className="text-xs">{value ? '✓' : '○'}</span>;
            case 'number':
                return <span className="text-xs text-slate-300">{value as number}</span>;
            case 'url':
                return (
                    <a href={value as string} target="_blank" rel="noopener" className="text-xs text-primary hover:underline truncate block">
                        {(value as string).replace(/^https?:\/\//, '')}
                    </a>
                );
            default:
                return <span className="text-xs text-slate-400 truncate block">{String(value)}</span>;
        }
    };

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {rows.map(row => {
                    const color = getCardColor(row);
                    const title = titleProperty ? (row.properties[titleProperty.id] as string) : '';

                    return (
                        <Card
                            key={row.id}
                            className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 group overflow-hidden"
                            onClick={() => onRowClick(row)}
                        >
                            {/* Color bar */}
                            <div className="h-1.5" style={{ backgroundColor: color }} />

                            <CardContent className="p-4">
                                {/* Header with title and actions */}
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-medium text-sm leading-snug line-clamp-2">
                                        {title || 'Untitled'}
                                    </h3>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicateRow(row.id); }}>
                                                <Copy className="h-4 w-4 mr-2" /> Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDeleteRow(row.id); }}>
                                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Property values */}
                                <div className="space-y-2">
                                    {displayProperties.map(prop => {
                                        const rendered = renderPropertyValue(row, prop);
                                        if (!rendered) return null;
                                        return (
                                            <div key={prop.id} className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wide w-16 flex-shrink-0 truncate">
                                                    {prop.name}
                                                </span>
                                                <div className="min-w-0">{rendered}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Add new card */}
                <Card
                    className="cursor-pointer hover:shadow-md transition-all border-dashed border-white/10 hover:border-white/20"
                    onClick={onAddRow}
                >
                    <CardContent className="flex flex-col items-center justify-center p-8 text-slate-400 hover:text-slate-300">
                        <Plus className="h-8 w-8 mb-2" />
                        <span className="text-sm">New item</span>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
