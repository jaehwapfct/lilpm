/**
 * IssueDatabaseViews
 * Renders database-style views (Chart, Timeline, Calendar, Gallery) for issues
 * using the IssuesDatabaseBridge.
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Search, BarChart3, GanttChart, Calendar, LayoutGrid, TableIcon, List
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
    DatabaseFilterBuilder,
    DatabaseSortBuilder,
    DatabasePropertyToggle,
    DatabaseGroupBy,
    DatabaseCalendarView,
    DatabaseGalleryView,
    DatabaseTimelineView,
    DatabaseChartView,
    DatabaseRowSidePeek,
    EditableCell,
    PROPERTY_ICONS,
} from '@/pages/hooks';
import type { DatabaseRow } from '@/pages/hooks';
import { useIssueDatabaseBridge } from '../adapters';

type IssueDbViewType = 'calendar' | 'timeline' | 'gallery' | 'chart';

interface IssueDatabaseViewsProps {
    activeView: IssueDbViewType;
    onViewChange: (view: IssueDbViewType) => void;
}

const VIEW_TABS: { id: IssueDbViewType; label: string; icon: React.ElementType }[] = [
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'timeline', label: 'Timeline', icon: GanttChart },
    { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
    { id: 'chart', label: 'Chart', icon: BarChart3 },
];

export function IssueDatabaseViews({ activeView, onViewChange }: IssueDatabaseViewsProps) {
    const { t } = useTranslation();
    const [sidePeekRow, setSidePeekRow] = useState<DatabaseRow | null>(null);
    const [sidePeekOpen, setSidePeekOpen] = useState(false);

    const {
        properties,
        filteredRows,
        filterGroup,
        setFilterGroup,
        sortConditions,
        setSortConditions,
        searchQuery,
        setSearchQuery,
        visibleProperties,
        setVisibleProperties,
        groupByPropertyId,
        setGroupByPropertyId,
        handleUpdateCell,
        handleAddRow,
        handleDeleteRow,
        handleAddSelectOption,
    } = useIssueDatabaseBridge();

    const openSidePeek = useCallback((row: DatabaseRow) => {
        setSidePeekRow(row);
        setSidePeekOpen(true);
    }, []);

    return (
        <div className="space-y-3">
            {/* View tabs */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 w-fit">
                {VIEW_TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onViewChange(tab.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                activeView === tab.id
                                    ? "bg-white/10 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
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
                    <DatabaseGroupBy
                        properties={properties}
                        groupByPropertyId={groupByPropertyId}
                        onGroupByChange={setGroupByPropertyId}
                    />
                </div>
                <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search issues..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-8 text-sm"
                    />
                </div>
            </div>

            {/* Active filter indicators */}
            {(filterGroup.conditions.length > 0 || sortConditions.length > 0) && (
                <div className="flex items-center gap-2 text-xs">
                    {filterGroup.conditions.length > 0 && (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                            {filterGroup.conditions.length} filter{filterGroup.conditions.length > 1 ? 's' : ''}
                        </Badge>
                    )}
                    {sortConditions.length > 0 && (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                            {sortConditions.length} sort{sortConditions.length > 1 ? 's' : ''}
                        </Badge>
                    )}
                    <span className="text-slate-400">{filteredRows.length} issues</span>
                </div>
            )}

            {/* View content */}
            <ScrollArea className="h-[calc(100vh-320px)]">
                {activeView === 'calendar' && (
                    <DatabaseCalendarView
                        rows={filteredRows}
                        properties={properties}
                        onRowClick={openSidePeek}
                        onAddRow={handleAddRow}
                    />
                )}
                {activeView === 'timeline' && (
                    <DatabaseTimelineView
                        rows={filteredRows}
                        properties={properties}
                        onRowClick={openSidePeek}
                    />
                )}
                {activeView === 'gallery' && (
                    <DatabaseGalleryView
                        rows={filteredRows}
                        properties={properties}
                        visibleProperties={visibleProperties}
                        onRowClick={openSidePeek}
                        onAddRow={handleAddRow}
                        onDeleteRow={handleDeleteRow}
                        onDuplicateRow={() => {}}
                    />
                )}
                {activeView === 'chart' && (
                    <DatabaseChartView
                        rows={filteredRows}
                        properties={properties}
                    />
                )}
            </ScrollArea>

            {/* Side Peek */}
            <DatabaseRowSidePeek
                row={sidePeekRow}
                properties={properties}
                open={sidePeekOpen}
                onOpenChange={(open) => {
                    setSidePeekOpen(open);
                    if (!open) setSidePeekRow(null);
                }}
                onUpdateCell={handleUpdateCell}
                onAddSelectOption={handleAddSelectOption}
                onDeleteRow={handleDeleteRow}
                onDuplicateRow={() => {}}
            />
        </div>
    );
}
