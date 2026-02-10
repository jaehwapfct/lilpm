import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Database, Table2, LayoutGrid, Calendar, List, Filter,
    SortAsc, SortDesc, Plus, Settings, ChevronDown, MoreHorizontal,
    Eye, EyeOff, Trash2, X, Check
} from 'lucide-react';

/**
 * LinkedDatabase Extension
 * Embeds a database view as a block within the editor
 * 
 * Fixed: Implemented working filter and sort functionality.
 * Fixed: Added filter/sort UI with dropdown menus.
 */

export interface DatabaseColumn {
    id: string;
    name: string;
    type: 'text' | 'number' | 'select' | 'multiSelect' | 'date' | 'checkbox' | 'url' | 'email' | 'person';
    options?: { id: string; name: string; color: string }[];
    width?: number;
    visible?: boolean;
}

export interface DatabaseRow {
    id: string;
    cells: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface DatabaseView {
    id: string;
    name: string;
    type: 'table' | 'board' | 'calendar' | 'list' | 'gallery';
    columns: string[]; // Column IDs to show
    sortBy?: { columnId: string; direction: 'asc' | 'desc' };
    filterBy?: { columnId: string; operator: string; value: any }[];
    groupBy?: string; // Column ID for board view
}

export interface DatabaseSource {
    id: string;
    name: string;
    emoji?: string;
    columns: DatabaseColumn[];
    rows: DatabaseRow[];
    views: DatabaseView[];
}

export interface LinkedDatabaseOptions {
    onFetchDatabase?: (databaseId: string) => Promise<DatabaseSource | null>;
    onUpdateRow?: (databaseId: string, rowId: string, cells: Record<string, any>) => Promise<void>;
    onAddRow?: (databaseId: string) => Promise<DatabaseRow>;
    onDeleteRow?: (databaseId: string, rowId: string) => Promise<void>;
    availableDatabases?: { id: string; name: string; emoji?: string }[];
}

// ============================================================
// Filter Dropdown Component
// ============================================================
const FilterDropdown: React.FC<{
    columns: DatabaseColumn[];
    filters: { columnId: string; operator: string; value: string }[];
    onFiltersChange: (filters: { columnId: string; operator: string; value: string }[]) => void;
    onClose: () => void;
}> = ({ columns, filters, onFiltersChange, onClose }) => {
    const addFilter = () => {
        if (columns.length > 0) {
            onFiltersChange([...filters, { columnId: columns[0].id, operator: 'contains', value: '' }]);
        }
    };

    const updateFilter = (index: number, field: string, value: string) => {
        const updated = [...filters];
        updated[index] = { ...updated[index], [field]: value };
        onFiltersChange(updated);
    };

    const removeFilter = (index: number) => {
        onFiltersChange(filters.filter((_, i) => i !== index));
    };

    const getOperators = (colType: string) => {
        switch (colType) {
            case 'number': return ['=', '!=', '>', '<', '>=', '<='];
            case 'checkbox': return ['is'];
            case 'select': return ['is', 'is not'];
            case 'date': return ['is', 'before', 'after'];
            default: return ['contains', 'does not contain', 'is', 'is not', 'is empty', 'is not empty'];
        }
    };

    return (
        <div className="absolute right-0 top-full mt-1 w-80 bg-[#1a1a1f] border rounded-lg shadow-lg p-3 z-20">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Filters</span>
                <button onClick={onClose} className="p-1 hover:bg-white/5 rounded">
                    <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
            </div>
            {filters.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No filters applied</p>
            ) : (
                <div className="space-y-2 mb-2">
                    {filters.map((filter, i) => {
                        const col = columns.find(c => c.id === filter.columnId);
                        return (
                            <div key={i} className="flex items-center gap-1.5">
                                <select
                                    value={filter.columnId}
                                    onChange={(e) => updateFilter(i, 'columnId', e.target.value)}
                                    className="flex-1 px-2 py-1 text-xs bg-[#0d0d0f] border rounded"
                                >
                                    {columns.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={filter.operator}
                                    onChange={(e) => updateFilter(i, 'operator', e.target.value)}
                                    className="px-2 py-1 text-xs bg-[#0d0d0f] border rounded"
                                >
                                    {getOperators(col?.type || 'text').map(op => (
                                        <option key={op} value={op}>{op}</option>
                                    ))}
                                </select>
                                {!['is empty', 'is not empty'].includes(filter.operator) && (
                                    col?.type === 'select' ? (
                                        <select
                                            value={filter.value}
                                            onChange={(e) => updateFilter(i, 'value', e.target.value)}
                                            className="flex-1 px-2 py-1 text-xs bg-[#0d0d0f] border rounded"
                                        >
                                            <option value="">Select...</option>
                                            {col.options?.map(opt => (
                                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                                            ))}
                                        </select>
                                    ) : col?.type === 'checkbox' ? (
                                        <select
                                            value={filter.value}
                                            onChange={(e) => updateFilter(i, 'value', e.target.value)}
                                            className="flex-1 px-2 py-1 text-xs bg-[#0d0d0f] border rounded"
                                        >
                                            <option value="true">Checked</option>
                                            <option value="false">Unchecked</option>
                                        </select>
                                    ) : (
                                        <input
                                            value={filter.value}
                                            onChange={(e) => updateFilter(i, 'value', e.target.value)}
                                            placeholder="Value..."
                                            className="flex-1 px-2 py-1 text-xs bg-[#0d0d0f] border rounded"
                                        />
                                    )
                                )}
                                <button onClick={() => removeFilter(i)} className="p-1 hover:bg-destructive/10 rounded">
                                    <X className="h-3 w-3 text-slate-400" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
            <button
                onClick={addFilter}
                className="w-full py-1.5 text-xs text-primary hover:bg-primary/5 rounded flex items-center justify-center gap-1"
            >
                <Plus className="h-3 w-3" /> Add filter
            </button>
        </div>
    );
};

// ============================================================
// Sort Dropdown Component
// ============================================================
const SortDropdown: React.FC<{
    columns: DatabaseColumn[];
    sort: { columnId: string; direction: 'asc' | 'desc' } | null;
    onSortChange: (sort: { columnId: string; direction: 'asc' | 'desc' } | null) => void;
    onClose: () => void;
}> = ({ columns, sort, onSortChange, onClose }) => {
    return (
        <div className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a1f] border rounded-lg shadow-lg p-2 z-20">
            <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-sm font-medium">Sort</span>
                <button onClick={onClose} className="p-1 hover:bg-white/5 rounded">
                    <X className="h-3.5 w-3.5 text-slate-400" />
                </button>
            </div>
            {sort && (
                <button
                    onClick={() => onSortChange(null)}
                    className="w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5 rounded mb-1 text-left"
                >
                    Remove sort
                </button>
            )}
            {columns.map(col => (
                <div key={col.id}>
                    <button
                        onClick={() => onSortChange({ columnId: col.id, direction: 'asc' })}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded hover:bg-white/5 ${sort?.columnId === col.id && sort.direction === 'asc' ? 'bg-white/5 text-primary' : ''}`}
                    >
                        <SortAsc className="h-3.5 w-3.5" />
                        {col.name} — Ascending
                        {sort?.columnId === col.id && sort.direction === 'asc' && <Check className="h-3 w-3 ml-auto" />}
                    </button>
                    <button
                        onClick={() => onSortChange({ columnId: col.id, direction: 'desc' })}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded hover:bg-white/5 ${sort?.columnId === col.id && sort.direction === 'desc' ? 'bg-white/5 text-primary' : ''}`}
                    >
                        <SortDesc className="h-3.5 w-3.5" />
                        {col.name} — Descending
                        {sort?.columnId === col.id && sort.direction === 'desc' && <Check className="h-3 w-3 ml-auto" />}
                    </button>
                </div>
            ))}
        </div>
    );
};

// ============================================================
// Table View Component
// ============================================================
const TableView: React.FC<{
    database: DatabaseSource;
    view: DatabaseView;
    onUpdateRow: (rowId: string, cells: Record<string, any>) => void;
    onAddRow: () => void;
    sort: { columnId: string; direction: 'asc' | 'desc' } | null;
    filters: { columnId: string; operator: string; value: string }[];
}> = ({ database, view, onUpdateRow, onAddRow, sort, filters }) => {
    const visibleColumns = database.columns.filter(col =>
        view.columns.includes(col.id)
    );

    // Apply filters
    const filteredRows = useMemo(() => {
        let rows = [...database.rows];

        for (const filter of filters) {
            const col = database.columns.find(c => c.id === filter.columnId);
            if (!col) continue;

            rows = rows.filter(row => {
                const val = row.cells[filter.columnId];
                const strVal = String(val || '').toLowerCase();
                const filterVal = filter.value.toLowerCase();

                switch (filter.operator) {
                    case 'contains': return strVal.includes(filterVal);
                    case 'does not contain': return !strVal.includes(filterVal);
                    case 'is': return strVal === filterVal;
                    case 'is not': return strVal !== filterVal;
                    case 'is empty': return !val || strVal === '';
                    case 'is not empty': return val && strVal !== '';
                    case '>': return Number(val) > Number(filter.value);
                    case '<': return Number(val) < Number(filter.value);
                    case '>=': return Number(val) >= Number(filter.value);
                    case '<=': return Number(val) <= Number(filter.value);
                    case '=': return Number(val) === Number(filter.value);
                    case '!=': return Number(val) !== Number(filter.value);
                    case 'before': return new Date(val) < new Date(filter.value);
                    case 'after': return new Date(val) > new Date(filter.value);
                    default: return true;
                }
            });
        }

        return rows;
    }, [database.rows, database.columns, filters]);

    // Apply sort
    const sortedRows = useMemo(() => {
        if (!sort) return filteredRows;

        const col = database.columns.find(c => c.id === sort.columnId);
        if (!col) return filteredRows;

        return [...filteredRows].sort((a, b) => {
            const aVal = a.cells[sort.columnId];
            const bVal = b.cells[sort.columnId];

            let comparison = 0;
            if (col.type === 'number') {
                comparison = (Number(aVal) || 0) - (Number(bVal) || 0);
            } else if (col.type === 'date') {
                comparison = new Date(aVal || 0).getTime() - new Date(bVal || 0).getTime();
            } else if (col.type === 'checkbox') {
                comparison = (aVal ? 1 : 0) - (bVal ? 1 : 0);
            } else {
                comparison = String(aVal || '').localeCompare(String(bVal || ''));
            }

            return sort.direction === 'desc' ? -comparison : comparison;
        });
    }, [filteredRows, sort, database.columns]);

    const getCellValue = (row: DatabaseRow, column: DatabaseColumn) => {
        const value = row.cells[column.id];

        switch (column.type) {
            case 'checkbox':
                return (
                    <input
                        type="checkbox"
                        checked={!!value}
                        onChange={() => onUpdateRow(row.id, { [column.id]: !value })}
                        className="h-4 w-4 rounded border-gray-300"
                    />
                );
            case 'select': {
                const option = column.options?.find(o => o.id === value);
                return option ? (
                    <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: option.color + '20', color: option.color }}
                    >
                        {option.name}
                    </span>
                ) : null;
            }
            case 'date':
                return value ? new Date(value).toLocaleDateString() : '';
            case 'url':
                return value ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate block">
                        {value}
                    </a>
                ) : '';
            default:
                return String(value || '');
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        {visibleColumns.map((col) => (
                            <th
                                key={col.id}
                                className="px-3 py-2 text-left font-medium text-slate-400"
                                style={{ width: col.width || 'auto' }}
                            >
                                {col.name}
                            </th>
                        ))}
                        <th className="w-10"></th>
                    </tr>
                </thead>
                <tbody>
                    {sortedRows.map((row) => (
                        <tr key={row.id} className="border-b hover:bg-white/5 group">
                            {visibleColumns.map((col) => (
                                <td key={col.id} className="px-3 py-2">
                                    {getCellValue(row, col)}
                                </td>
                            ))}
                            <td className="px-2">
                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded">
                                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {sortedRows.length === 0 && (
                        <tr>
                            <td colSpan={visibleColumns.length + 1} className="px-3 py-8 text-center text-slate-400 text-sm">
                                {filters.length > 0 ? 'No rows match the current filters' : 'No data yet'}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            <button
                onClick={onAddRow}
                className="w-full py-2 text-sm text-slate-400 hover:bg-white/5 flex items-center justify-center gap-1"
            >
                <Plus className="h-4 w-4" />
                New
            </button>
        </div>
    );
};

// ============================================================
// Board View Component
// ============================================================
const BoardView: React.FC<{
    database: DatabaseSource;
    view: DatabaseView;
    onUpdateRow: (rowId: string, cells: Record<string, any>) => void;
    onAddRow: () => void;
}> = ({ database, view, onUpdateRow, onAddRow }) => {
    const groupColumn = database.columns.find(c => c.id === view.groupBy);
    const groups = groupColumn?.options || [{ id: 'none', name: 'No Status', color: '#888' }];

    const getRowsForGroup = (groupId: string) => {
        return database.rows.filter(row =>
            (row.cells[view.groupBy || ''] || 'none') === groupId
        );
    };

    return (
        <div className="flex gap-4 overflow-x-auto pb-4">
            {groups.map((group) => (
                <div key={group.id} className="flex-shrink-0 w-64">
                    <div
                        className="px-3 py-2 rounded-t-lg font-medium text-sm flex items-center gap-2"
                        style={{ backgroundColor: group.color + '20', color: group.color }}
                    >
                        <span>{group.name}</span>
                        <span className="text-xs opacity-70">{getRowsForGroup(group.id).length}</span>
                    </div>
                    <div className="bg-white/5 rounded-b-lg p-2 min-h-[100px] space-y-2">
                        {getRowsForGroup(group.id).map((row) => (
                            <div
                                key={row.id}
                                className="bg-[#0d0d0f] p-3 rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                            >
                                <div className="font-medium text-sm truncate">
                                    {row.cells[database.columns[0]?.id] || 'Untitled'}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {new Date(row.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={onAddRow}
                            className="w-full py-2 text-xs text-slate-400 hover:bg-white/5 rounded flex items-center justify-center gap-1"
                        >
                            <Plus className="h-3 w-3" />
                            Add
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ============================================================
// Calendar View Component
// ============================================================
const CalendarView: React.FC<{
    database: DatabaseSource;
    view: DatabaseView;
    onAddRow: () => void;
}> = ({ database, view, onAddRow }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const dateColumn = database.columns.find(c => c.type === 'date');

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const getRowsForDate = (day: number) => {
        if (!dateColumn) return [];
        const targetDate = new Date(year, month, day).toDateString();
        return database.rows.filter(row => {
            const val = row.cells[dateColumn.id];
            return val && new Date(val).toDateString() === targetDate;
        });
    };

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

    return (
        <div>
            <div className="flex items-center justify-between px-2 py-2 mb-2">
                <button onClick={prevMonth} className="px-2 py-1 text-xs hover:bg-white/5 rounded">&lt;</button>
                <span className="text-sm font-medium">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={nextMonth} className="px-2 py-1 text-xs hover:bg-white/5 rounded">&gt;</button>
            </div>
            {!dateColumn ? (
                <p className="text-xs text-slate-400 text-center py-4">Add a date column to use Calendar view</p>
            ) : (
                <div className="grid grid-cols-7 gap-px bg-white/5 rounded-lg overflow-hidden">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-[10px] text-slate-400 text-center py-1 bg-[#121215] font-medium">{d}</div>
                    ))}
                    {days.map((day, i) => {
                        const rows = day ? getRowsForDate(day) : [];
                        const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();
                        return (
                            <div
                                key={i}
                                className={`min-h-[60px] p-1 bg-[#0d0d0f] ${!day ? 'opacity-30' : ''}`}
                            >
                                {day && (
                                    <>
                                        <div className={`text-[10px] mb-0.5 ${isToday ? 'text-primary font-bold' : 'text-slate-400'}`}>{day}</div>
                                        {rows.slice(0, 2).map(row => (
                                            <div key={row.id} className="text-[10px] truncate px-1 py-0.5 bg-primary/10 text-primary rounded mb-0.5">
                                                {row.cells[database.columns[0]?.id] || 'Untitled'}
                                            </div>
                                        ))}
                                        {rows.length > 2 && (
                                            <div className="text-[9px] text-slate-400 px-1">+{rows.length - 2} more</div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ============================================================
// Gallery View Component
// ============================================================
const GalleryView: React.FC<{
    database: DatabaseSource;
    view: DatabaseView;
    onAddRow: () => void;
}> = ({ database, view, onAddRow }) => {
    const visibleColumns = database.columns.filter(col => view.columns.includes(col.id));

    return (
        <div>
            <div className="grid grid-cols-3 gap-3">
                {database.rows.map(row => (
                    <div key={row.id} className="bg-[#0d0d0f] rounded-lg border hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
                        {/* Card image placeholder */}
                        <div className="h-24 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                            <span className="text-2xl opacity-50">📄</span>
                        </div>
                        <div className="p-3">
                            <div className="font-medium text-sm truncate mb-1">
                                {row.cells[database.columns[0]?.id] || 'Untitled'}
                            </div>
                            {visibleColumns.slice(1, 3).map(col => {
                                const val = row.cells[col.id];
                                if (!val) return null;
                                if (col.type === 'select') {
                                    const opt = col.options?.find(o => o.id === val);
                                    return opt ? (
                                        <span key={col.id} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium mr-1 mb-1" style={{ backgroundColor: opt.color + '20', color: opt.color }}>
                                            {opt.name}
                                        </span>
                                    ) : null;
                                }
                                return (
                                    <div key={col.id} className="text-[11px] text-slate-400 truncate">
                                        {col.type === 'date' ? new Date(val).toLocaleDateString() : String(val)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={onAddRow} className="w-full py-2 mt-2 text-sm text-slate-400 hover:bg-white/5 flex items-center justify-center gap-1 rounded">
                <Plus className="h-4 w-4" /> New
            </button>
        </div>
    );
};

// ============================================================
// List View Component
// ============================================================
const ListView: React.FC<{
    database: DatabaseSource;
    view: DatabaseView;
    onAddRow: () => void;
}> = ({ database, view, onAddRow }) => {
    return (
        <div className="space-y-0.5">
            {database.rows.map(row => (
                <div key={row.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded cursor-pointer group">
                    <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{row.cells[database.columns[0]?.id] || 'Untitled'}</span>
                    </div>
                    {database.columns.slice(1, 4).map(col => {
                        const val = row.cells[col.id];
                        if (!val) return <div key={col.id} className="w-24" />;
                        if (col.type === 'select') {
                            const opt = col.options?.find(o => o.id === val);
                            return opt ? (
                                <span key={col.id} className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0" style={{ backgroundColor: opt.color + '20', color: opt.color }}>
                                    {opt.name}
                                </span>
                            ) : <div key={col.id} className="w-24" />;
                        }
                        if (col.type === 'date') return <span key={col.id} className="text-xs text-slate-400 flex-shrink-0 w-24">{new Date(val).toLocaleDateString()}</span>;
                        if (col.type === 'checkbox') return <input key={col.id} type="checkbox" checked={!!val} readOnly className="h-4 w-4 flex-shrink-0" />;
                        return <span key={col.id} className="text-xs text-slate-400 truncate flex-shrink-0 w-24">{String(val)}</span>;
                    })}
                </div>
            ))}
            {database.rows.length === 0 && (
                <div className="text-center py-6 text-sm text-slate-400">No items yet</div>
            )}
            <button onClick={onAddRow} className="w-full py-2 text-sm text-slate-400 hover:bg-white/5 flex items-center justify-center gap-1 rounded">
                <Plus className="h-4 w-4" /> New
            </button>
        </div>
    );
};

// ============================================================
// Main LinkedDatabase Component
// ============================================================
const LinkedDatabaseComponent: React.FC<NodeViewProps> = ({
    node,
    updateAttributes,
    selected,
    deleteNode,
    extension,
}) => {
    const { databaseId, viewId, title } = node.attrs;
    const [database, setDatabase] = useState<DatabaseSource | null>(null);
    const [currentView, setCurrentView] = useState<DatabaseView | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPicker, setShowPicker] = useState(!databaseId);
    const [showViewMenu, setShowViewMenu] = useState(false);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);

    // Local filter/sort state
    const [localFilters, setLocalFilters] = useState<{ columnId: string; operator: string; value: string }[]>([]);
    const [localSort, setLocalSort] = useState<{ columnId: string; direction: 'asc' | 'desc' } | null>(null);

    const options = extension.options as LinkedDatabaseOptions;

    useEffect(() => {
        if (databaseId && options.onFetchDatabase) {
            setIsLoading(true);
            options.onFetchDatabase(databaseId)
                .then(db => {
                    setDatabase(db);
                    if (db && viewId) {
                        const view = db.views.find(v => v.id === viewId) || db.views[0];
                        setCurrentView(view);
                        // Initialize from view's saved filter/sort
                        if (view?.filterBy) {
                            setLocalFilters(view.filterBy.map(f => ({ ...f, value: String(f.value || '') })));
                        }
                        if (view?.sortBy) {
                            setLocalSort(view.sortBy);
                        }
                    } else if (db) {
                        setCurrentView(db.views[0]);
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }, [databaseId, viewId]);

    const handleSelectDatabase = (dbId: string, dbName: string) => {
        updateAttributes({ databaseId: dbId, title: dbName });
        setShowPicker(false);
    };

    const handleUpdateRow = async (rowId: string, cells: Record<string, any>) => {
        if (options.onUpdateRow && databaseId) {
            await options.onUpdateRow(databaseId, rowId, cells);
        }
        // Optimistically update local state
        if (database) {
            setDatabase({
                ...database,
                rows: database.rows.map(r =>
                    r.id === rowId ? { ...r, cells: { ...r.cells, ...cells } } : r
                ),
            });
        }
    };

    const handleAddRow = async () => {
        if (options.onAddRow && databaseId) {
            const newRow = await options.onAddRow(databaseId);
            if (database) {
                setDatabase({
                    ...database,
                    rows: [...database.rows, newRow],
                });
            }
        }
    };

    const getViewIcon = (type: string) => {
        const icons: Record<string, React.ReactNode> = {
            table: <Table2 className="h-4 w-4" />,
            board: <LayoutGrid className="h-4 w-4" />,
            calendar: <Calendar className="h-4 w-4" />,
            list: <List className="h-4 w-4" />,
            gallery: <LayoutGrid className="h-4 w-4" />,
        };
        return icons[type] || icons.table;
    };

    if (showPicker) {
        return (
            <NodeViewWrapper>
                <div className={`p-6 rounded-lg border-2 border-dashed ${selected ? 'border-primary' : 'border-white/10'} bg-white/5`}>
                    <div className="flex items-center gap-3 mb-4">
                        <Database className="h-6 w-6 text-slate-400" />
                        <div>
                            <h3 className="font-medium">Link a Database</h3>
                            <p className="text-sm text-slate-400">Create a linked view of an existing database</p>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {(options.availableDatabases || []).map((db) => (
                            <button
                                key={db.id}
                                onClick={() => handleSelectDatabase(db.id, db.name)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-left"
                            >
                                <span className="text-lg">{db.emoji || '📊'}</span>
                                <span className="font-medium">{db.name}</span>
                            </button>
                        ))}
                        {(!options.availableDatabases || options.availableDatabases.length === 0) && (
                            <div className="text-center py-8 text-slate-400">
                                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No databases available</p>
                                <p className="text-xs mt-1">Create a database first to link it here</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={deleteNode}
                            className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-xl"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </NodeViewWrapper>
        );
    }

    return (
        <NodeViewWrapper>
            <div className={`my-4 rounded-lg border ${selected ? 'ring-2 ring-primary' : ''} bg-[#1a1a1f]`}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{database?.emoji || '📊'}</span>
                        <h3 className="font-medium">{title || database?.name || 'Database'}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                        {/* View Switcher */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowViewMenu(!showViewMenu);
                                    setShowFilterMenu(false);
                                    setShowSortMenu(false);
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-white/5 rounded"
                            >
                                {currentView && getViewIcon(currentView.type)}
                                <span>{currentView?.name || 'Table'}</span>
                                <ChevronDown className="h-3 w-3" />
                            </button>

                            {showViewMenu && database && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a1f] border rounded-lg shadow-lg p-1 z-20">
                                    {database.views.map((view) => (
                                        <button
                                            key={view.id}
                                            onClick={() => {
                                                setCurrentView(view);
                                                updateAttributes({ viewId: view.id });
                                                setShowViewMenu(false);
                                            }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-white/5 ${currentView?.id === view.id ? 'bg-white/5' : ''
                                                }`}
                                        >
                                            {getViewIcon(view.type)}
                                            {view.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Filter Button */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowFilterMenu(!showFilterMenu);
                                    setShowSortMenu(false);
                                    setShowViewMenu(false);
                                }}
                                className={`p-1.5 hover:bg-white/5 rounded ${localFilters.length > 0 ? 'text-primary' : ''}`}
                                title="Filter"
                            >
                                <Filter className="h-4 w-4" />
                                {localFilters.length > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-primary text-primary-foreground text-[9px] rounded-full flex items-center justify-center font-bold">
                                        {localFilters.length}
                                    </span>
                                )}
                            </button>
                            {showFilterMenu && database && (
                                <FilterDropdown
                                    columns={database.columns}
                                    filters={localFilters}
                                    onFiltersChange={setLocalFilters}
                                    onClose={() => setShowFilterMenu(false)}
                                />
                            )}
                        </div>

                        {/* Sort Button */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowSortMenu(!showSortMenu);
                                    setShowFilterMenu(false);
                                    setShowViewMenu(false);
                                }}
                                className={`p-1.5 hover:bg-white/5 rounded ${localSort ? 'text-primary' : ''}`}
                                title="Sort"
                            >
                                <SortAsc className="h-4 w-4" />
                            </button>
                            {showSortMenu && database && (
                                <SortDropdown
                                    columns={database.columns}
                                    sort={localSort}
                                    onSortChange={(s) => {
                                        setLocalSort(s);
                                        setShowSortMenu(false);
                                    }}
                                    onClose={() => setShowSortMenu(false)}
                                />
                            )}
                        </div>

                        <button
                            onClick={deleteNode}
                            className="p-1.5 hover:bg-destructive/10 rounded"
                            title="Remove database"
                        >
                            <Trash2 className="h-4 w-4 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Active filters indicator */}
                {localFilters.length > 0 && (
                    <div className="px-4 py-1.5 bg-primary/5 border-b flex items-center gap-2 text-xs">
                        <Filter className="h-3 w-3 text-primary" />
                        <span className="text-primary">{localFilters.length} filter{localFilters.length > 1 ? 's' : ''} active</span>
                        <button
                            onClick={() => setLocalFilters([])}
                            className="ml-auto text-slate-400 hover:text-primary"
                        >
                            Clear all
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : database && currentView ? (
                        currentView.type === 'board' ? (
                            <BoardView
                                database={database}
                                view={currentView}
                                onUpdateRow={handleUpdateRow}
                                onAddRow={handleAddRow}
                            />
                        ) : currentView.type === 'calendar' ? (
                            <CalendarView
                                database={database}
                                view={currentView}
                                onAddRow={handleAddRow}
                            />
                        ) : currentView.type === 'gallery' ? (
                            <GalleryView
                                database={database}
                                view={currentView}
                                onAddRow={handleAddRow}
                            />
                        ) : currentView.type === 'list' ? (
                            <ListView
                                database={database}
                                view={currentView}
                                onAddRow={handleAddRow}
                            />
                        ) : (
                            <TableView
                                database={database}
                                view={currentView}
                                onUpdateRow={handleUpdateRow}
                                onAddRow={handleAddRow}
                                sort={localSort}
                                filters={localFilters}
                            />
                        )
                    ) : (
                        <div className="text-center py-8 text-slate-400">
                            <p>Failed to load database</p>
                        </div>
                    )}
                </div>
            </div>
        </NodeViewWrapper>
    );
};

export const LinkedDatabase = Node.create<LinkedDatabaseOptions>({
    name: 'linkedDatabase',

    group: 'block',

    atom: true,

    addOptions() {
        return {
            onFetchDatabase: undefined,
            onUpdateRow: undefined,
            onAddRow: undefined,
            onDeleteRow: undefined,
            availableDatabases: [],
        };
    },

    addAttributes() {
        return {
            databaseId: { default: null },
            viewId: { default: null },
            title: { default: '' },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-type="linked-database"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'linked-database' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(LinkedDatabaseComponent);
    },
});

export default LinkedDatabase;
