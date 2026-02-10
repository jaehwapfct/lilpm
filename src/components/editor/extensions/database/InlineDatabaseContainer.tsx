/**
 * InlineDatabaseContainer
 * A shared component that renders a mini database inside the editor,
 * using the same components as DatabasePage but in a compact form.
 * 
 * Used by both:
 * - InlineDatabase (creates new DB in databases table)
 * - LinkedDatabase (links existing DB)
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Plus, MoreHorizontal, ExternalLink, Trash2, Copy, Search, Filter,
    TableIcon, Kanban, Calendar, List, LayoutGrid,
    Hash, Type, CalendarIcon, Link, CheckSquare, Tag, ToggleLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    EditableCell,
    PROPERTY_ICONS,
    DatabaseFilterBuilder,
    DatabaseSortBuilder,
    DatabaseCalendarView,
    DatabaseGalleryView,
} from '@/pages/hooks';
import type { DatabaseProperty, DatabaseRow, FilterGroup, SortCondition, PropertyType } from '@/pages/hooks/databaseTypes';
import { evaluateFilterGroup } from '@/pages/hooks/DatabaseFilterBuilder';

type InlineViewType = 'table' | 'board' | 'list' | 'calendar' | 'gallery';

interface InlineDatabaseContainerProps {
    title: string;
    properties: DatabaseProperty[];
    rows: DatabaseRow[];
    onTitleChange: (title: string) => void;
    onUpdateCell: (rowId: string, propertyId: string, value: unknown) => void;
    onAddRow: () => void;
    onDeleteRow: (rowId: string) => void;
    onAddProperty: (type: PropertyType) => void;
    onAddSelectOption: (propertyId: string, name: string) => Promise<{ id: string; name: string; color: string } | undefined>;
    onOpenFullPage?: () => void;
    compact?: boolean;
}

export function InlineDatabaseContainer({
    title,
    properties,
    rows,
    onTitleChange,
    onUpdateCell,
    onAddRow,
    onDeleteRow,
    onAddProperty,
    onAddSelectOption,
    onOpenFullPage,
    compact = true,
}: InlineDatabaseContainerProps) {
    const [activeView, setActiveView] = useState<InlineViewType>('table');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(title);
    const [searchQuery, setSearchQuery] = useState('');
    const [showToolbar, setShowToolbar] = useState(false);
    const [filterGroup, setFilterGroup] = useState<FilterGroup>({ combinator: 'and', conditions: [] });
    const [sortConditions, setSortConditions] = useState<SortCondition[]>([]);

    useEffect(() => { setEditTitle(title); }, [title]);

    // Filtered/sorted rows
    const displayRows = useMemo(() => {
        let result = rows;
        if (searchQuery) {
            result = result.filter(r =>
                Object.values(r.properties).some(v =>
                    String(v).toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }
        if (filterGroup.conditions.length > 0) {
            result = result.filter(r =>
                evaluateFilterGroup(r.properties, filterGroup, properties)
            );
        }
        if (sortConditions.length > 0) {
            result = [...result].sort((a, b) => {
                for (const sort of sortConditions) {
                    const prop = properties.find(p => p.id === sort.propertyId);
                    if (!prop) continue;
                    const aVal = a.properties[sort.propertyId];
                    const bVal = b.properties[sort.propertyId];
                    if (aVal == null && bVal == null) continue;
                    if (aVal == null) return sort.direction === 'desc' ? 1 : -1;
                    if (bVal == null) return sort.direction === 'desc' ? -1 : 1;
                    const cmp = String(aVal).localeCompare(String(bVal));
                    if (cmp !== 0) return sort.direction === 'desc' ? -cmp : cmp;
                }
                return 0;
            });
        }
        return result;
    }, [rows, searchQuery, filterGroup, sortConditions, properties]);

    const makeCellUpdater = useCallback((rowId: string, propertyId: string) => {
        return (value: unknown) => onUpdateCell(rowId, propertyId, value);
    }, [onUpdateCell]);

    const makeOptionAdder = useCallback((propertyId: string) => {
        return (name: string) => onAddSelectOption(propertyId, name);
    }, [onAddSelectOption]);

    // View tabs
    const views: { id: InlineViewType; icon: React.ElementType; label: string }[] = [
        { id: 'table', icon: TableIcon, label: 'Table' },
        { id: 'board', icon: Kanban, label: 'Board' },
        { id: 'list', icon: List, label: 'List' },
        { id: 'calendar', icon: Calendar, label: 'Calendar' },
        { id: 'gallery', icon: LayoutGrid, label: 'Gallery' },
    ];

    return (
        <div
            className="border border-white/10 rounded-xl overflow-hidden bg-[#0d0d0f] my-2"
            onMouseEnter={() => setShowToolbar(true)}
            onMouseLeave={() => setShowToolbar(false)}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02]">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-base">📊</span>
                    {isEditingTitle ? (
                        <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => { onTitleChange(editTitle); setIsEditingTitle(false); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { onTitleChange(editTitle); setIsEditingTitle(false); } }}
                            className="h-7 text-sm font-semibold bg-transparent border-primary/50"
                            autoFocus
                        />
                    ) : (
                        <button
                            className="text-sm font-semibold hover:text-primary transition-colors truncate"
                            onClick={() => setIsEditingTitle(true)}
                        >
                            {title || 'Untitled database'}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* View tabs (compact) */}
                    <div className="flex items-center gap-0.5 bg-white/5 rounded p-0.5">
                        {views.map(v => {
                            const Icon = v.icon;
                            return (
                                <button
                                    key={v.id}
                                    onClick={() => setActiveView(v.id)}
                                    className={cn(
                                        "p-1 rounded text-xs transition-colors",
                                        activeView === v.id ? "bg-white/10 text-white" : "text-slate-500 hover:text-white"
                                    )}
                                    title={v.label}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                </button>
                            );
                        })}
                    </div>

                    {onOpenFullPage && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onOpenFullPage} title="Open as full page">
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Toolbar (shown on hover or if filters/sorts active) */}
            {(showToolbar || filterGroup.conditions.length > 0 || sortConditions.length > 0) && (
                <div className="flex items-center gap-2 px-3 py-1.5 border-t border-white/5 bg-white/[0.01]">
                    <DatabaseFilterBuilder
                        properties={properties}
                        filterGroup={filterGroup}
                        onFilterChange={setFilterGroup}
                        activeFilterCount={filterGroup.conditions.length}
                    />
                    <DatabaseSortBuilder
                        properties={properties}
                        sortConditions={sortConditions}
                        onSortChange={setSortConditions}
                    />
                    <div className="ml-auto relative w-36">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="h-7 pl-7 text-xs bg-transparent"
                        />
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={compact ? "max-h-[400px] overflow-auto" : ""}>
                {activeView === 'table' && (
                    <InlineTableView
                        rows={displayRows}
                        properties={properties}
                        makeCellUpdater={makeCellUpdater}
                        makeOptionAdder={makeOptionAdder}
                        onAddRow={onAddRow}
                        onDeleteRow={onDeleteRow}
                        onAddProperty={onAddProperty}
                    />
                )}
                {activeView === 'calendar' && (
                    <DatabaseCalendarView
                        rows={displayRows}
                        properties={properties}
                        onRowClick={() => {}}
                        onAddRow={onAddRow}
                    />
                )}
                {activeView === 'gallery' && (
                    <DatabaseGalleryView
                        rows={displayRows}
                        properties={properties}
                        onRowClick={() => {}}
                        onAddRow={onAddRow}
                        onDeleteRow={onDeleteRow}
                        onDuplicateRow={() => {}}
                    />
                )}
                {(activeView === 'board' || activeView === 'list') && (
                    <div className="p-4 text-center text-slate-500 text-sm">
                        <ExternalLink className="h-5 w-5 mx-auto mb-2" />
                        Open as full page for {activeView} view
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Compact Table View ─────────────────────────────────────
function InlineTableView({
    rows, properties, makeCellUpdater, makeOptionAdder, onAddRow, onDeleteRow, onAddProperty,
}: {
    rows: DatabaseRow[];
    properties: DatabaseProperty[];
    makeCellUpdater: (rowId: string, propId: string) => (value: unknown) => void;
    makeOptionAdder: (propId: string) => (name: string) => Promise<{ id: string; name: string; color: string } | undefined>;
    onAddRow: () => void;
    onDeleteRow: (rowId: string) => void;
    onAddProperty: (type: PropertyType) => void;
}) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    {properties.map(prop => (
                        <TableHead key={prop.id} className="min-w-[120px] text-xs h-8">
                            <div className="flex items-center gap-1.5">
                                {React.createElement(PROPERTY_ICONS[prop.type] || Type, { className: 'h-3 w-3 text-slate-500' })}
                                {prop.name}
                            </div>
                        </TableHead>
                    ))}
                    <TableHead className="w-[40px] h-8">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => onAddProperty('text')}><Type className="h-3.5 w-3.5 mr-2" /> Text</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAddProperty('number')}><Hash className="h-3.5 w-3.5 mr-2" /> Number</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAddProperty('select')}><Tag className="h-3.5 w-3.5 mr-2" /> Select</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAddProperty('date')}><CalendarIcon className="h-3.5 w-3.5 mr-2" /> Date</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAddProperty('checkbox')}><CheckSquare className="h-3.5 w-3.5 mr-2" /> Checkbox</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAddProperty('url')}><Link className="h-3.5 w-3.5 mr-2" /> URL</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map(row => (
                    <TableRow key={row.id} className="hover:bg-white/5 group">
                        {properties.map(prop => (
                            <TableCell key={prop.id} className="p-1">
                                <EditableCell
                                    value={row.properties[prop.id]}
                                    property={prop}
                                    onUpdate={makeCellUpdater(row.id, prop.id)}
                                    onAddOption={
                                        ['select', 'multi_select', 'status'].includes(prop.type)
                                            ? makeOptionAdder(prop.id)
                                            : undefined
                                    }
                                />
                            </TableCell>
                        ))}
                        <TableCell className="p-0.5">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => onDeleteRow(row.id)}
                            >
                                <Trash2 className="h-3 w-3 text-slate-400" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
                <TableRow className="hover:bg-white/5 cursor-pointer" onClick={onAddRow}>
                    <TableCell colSpan={properties.length + 1} className="py-1.5">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <Plus className="h-3 w-3" /> New row
                        </div>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    );
}
