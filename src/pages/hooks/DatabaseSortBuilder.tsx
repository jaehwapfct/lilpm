import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ArrowUpDown, ArrowUp, ArrowDown, Plus, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DatabaseProperty, SortCondition } from './databaseTypes';
import { PROPERTY_ICONS } from './databaseTypes';

interface DatabaseSortBuilderProps {
    properties: DatabaseProperty[];
    sortConditions: SortCondition[];
    onSortChange: (sorts: SortCondition[]) => void;
}

export function DatabaseSortBuilder({
    properties,
    sortConditions,
    onSortChange,
}: DatabaseSortBuilderProps) {
    const [open, setOpen] = React.useState(false);

    const sortableProperties = properties.filter(
        p => !['formula', 'relation', 'rollup', 'files'].includes(p.type)
    );

    // Filter out properties already in sorts
    const availableProperties = sortableProperties.filter(
        p => !sortConditions.some(s => s.propertyId === p.id)
    );

    const addSort = () => {
        if (availableProperties.length === 0) return;
        const firstProp = availableProperties[0];
        const newSort: SortCondition = {
            id: Date.now().toString(),
            propertyId: firstProp.id,
            direction: 'asc',
        };
        onSortChange([...sortConditions, newSort]);
    };

    const updateSort = (id: string, updates: Partial<SortCondition>) => {
        onSortChange(sortConditions.map(s =>
            s.id === id ? { ...s, ...updates } : s
        ));
    };

    const removeSort = (id: string) => {
        onSortChange(sortConditions.filter(s => s.id !== id));
    };

    const clearAll = () => {
        onSortChange([]);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(sortConditions.length > 0 && "border-primary text-primary")}>
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Sort
                    {sortConditions.length > 0 && (
                        <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                            {sortConditions.length}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="end">
                <div className="p-3 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Sort</span>
                        {sortConditions.length > 0 && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400" onClick={clearAll}>
                                Clear all
                            </Button>
                        )}
                    </div>
                </div>

                <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                    {sortConditions.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-4">
                            No sorts applied. Click + to add one.
                        </div>
                    ) : (
                        sortConditions.map((sort, index) => {
                            const property = properties.find(p => p.id === sort.propertyId);

                            return (
                                <div key={sort.id} className="flex items-center gap-2">
                                    {/* Property selector */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8 min-w-[120px] justify-between text-xs">
                                                {property ? (
                                                    <div className="flex items-center gap-1.5">
                                                        {React.createElement(PROPERTY_ICONS[property.type], { className: 'h-3.5 w-3.5 text-slate-400' })}
                                                        <span className="truncate">{property.name}</span>
                                                    </div>
                                                ) : 'Select'}
                                                <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {sortableProperties.map(prop => (
                                                <DropdownMenuItem
                                                    key={prop.id}
                                                    onClick={() => updateSort(sort.id, { propertyId: prop.id })}
                                                >
                                                    {React.createElement(PROPERTY_ICONS[prop.type], { className: 'h-3.5 w-3.5 mr-2 text-slate-400' })}
                                                    {prop.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Direction toggle */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 min-w-[110px] justify-between text-xs"
                                        onClick={() => updateSort(sort.id, { direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
                                    >
                                        {sort.direction === 'asc' ? (
                                            <div className="flex items-center gap-1.5">
                                                <ArrowUp className="h-3.5 w-3.5" />
                                                Ascending
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5">
                                                <ArrowDown className="h-3.5 w-3.5" />
                                                Descending
                                            </div>
                                        )}
                                    </Button>

                                    {/* Remove */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 flex-shrink-0 text-slate-400 hover:text-destructive"
                                        onClick={() => removeSort(sort.id)}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-3 border-t border-white/10">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={addSort}
                        disabled={availableProperties.length === 0}
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add sort
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
