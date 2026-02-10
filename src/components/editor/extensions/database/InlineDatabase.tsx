import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import React, { useState, useCallback } from 'react';
import {
    Database, Plus, Trash2, GripVertical, Settings,
    Type, Hash, Calendar, CheckSquare, Link, Tag,
    ChevronDown, MoreHorizontal
} from 'lucide-react';
import { InlineDatabaseContainer } from './InlineDatabaseContainer';

// Use native crypto.randomUUID for ID generation
const generateId = () => crypto.randomUUID();

/**
 * InlineDatabase Extension
 * Creates a new inline database directly in the editor
 */

export interface InlineColumn {
    id: string;
    name: string;
    type: 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'url';
    options?: { id: string; name: string; color: string }[];
    width: number;
}

export interface InlineRow {
    id: string;
    cells: Record<string, any>;
}

export interface InlineDatabaseOptions {
    onDatabaseChange?: (databaseId: string, columns: InlineColumn[], rows: InlineRow[]) => void;
}

const defaultColumns: InlineColumn[] = [
    { id: 'title', name: 'Title', type: 'text', width: 200 },
    {
        id: 'status', name: 'Status', type: 'select', width: 120, options: [
            { id: 'todo', name: 'To Do', color: '#6B7280' },
            { id: 'progress', name: 'In Progress', color: '#3B82F6' },
            { id: 'done', name: 'Done', color: '#10B981' },
        ]
    },
    { id: 'date', name: 'Date', type: 'date', width: 120 },
];

const defaultRows: InlineRow[] = [
    { id: generateId(), cells: { title: 'Task 1', status: 'todo', date: '' } },
    { id: generateId(), cells: { title: 'Task 2', status: 'progress', date: '' } },
];

const columnTypeIcons: Record<string, React.ReactNode> = {
    text: <Type className="h-3 w-3" />,
    number: <Hash className="h-3 w-3" />,
    select: <Tag className="h-3 w-3" />,
    date: <Calendar className="h-3 w-3" />,
    checkbox: <CheckSquare className="h-3 w-3" />,
    url: <Link className="h-3 w-3" />,
};

const selectColors = [
    '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981',
    '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'
];

// Editable Cell Component
const EditableCell: React.FC<{
    column: InlineColumn;
    value: any;
    onChange: (value: any) => void;
}> = ({ column, value, onChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    switch (column.type) {
        case 'checkbox':
            return (
                <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(e) => onChange(e.target.checked)}
                    className="h-4 w-4 rounded"
                />
            );

        case 'select': {
            const selected = column.options?.find(o => o.id === value);
            return (
                <div className="relative">
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        className="w-full text-left"
                    >
                        {selected ? (
                            <span
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{ backgroundColor: selected.color + '20', color: selected.color }}
                            >
                                {selected.name}
                            </span>
                        ) : (
                            <span className="text-slate-400 text-xs">Select...</span>
                        )}
                    </button>
                    {showOptions && (
                        <div className="absolute top-full left-0 mt-1 w-32 bg-[#1a1a1f] border rounded shadow-lg z-20 p-1">
                            {column.options?.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => {
                                        onChange(opt.id);
                                        setShowOptions(false);
                                    }}
                                    className="w-full px-2 py-1 text-left hover:bg-white/5 rounded text-xs flex items-center gap-2"
                                >
                                    <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: opt.color }}
                                    />
                                    {opt.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        case 'date':
            return (
                <input
                    type="date"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs"
                />
            );

        case 'number':
            return (
                <input
                    type="number"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-transparent border-none outline-none text-xs"
                    placeholder="0"
                />
            );

        case 'url':
            return isEditing ? (
                <input
                    type="url"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={() => setIsEditing(false)}
                    className="w-full bg-transparent border-none outline-none text-xs"
                    placeholder="https://"
                    autoFocus
                />
            ) : (
                <div
                    onClick={() => setIsEditing(true)}
                    className="truncate text-xs text-primary underline cursor-pointer"
                >
                    {value || <span className="text-slate-400 no-underline">Add URL</span>}
                </div>
            );

        default: // text
            return isEditing ? (
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={() => setIsEditing(false)}
                    className="w-full bg-transparent border-none outline-none text-xs"
                    autoFocus
                />
            ) : (
                <div
                    onClick={() => setIsEditing(true)}
                    className="truncate text-xs cursor-text min-h-[20px]"
                >
                    {value || <span className="text-slate-400">Empty</span>}
                </div>
            );
    }
};

// ── Convert InlineColumn/InlineRow to DatabaseProperty/DatabaseRow ──
function toDbProperties(columns: InlineColumn[]): import('@/pages/hooks/databaseTypes').DatabaseProperty[] {
    return columns.map(col => ({
        id: col.id,
        name: col.name,
        type: col.type as import('@/pages/hooks/databaseTypes').PropertyType,
        options: col.options,
    }));
}

function toDbRows(rows: InlineRow[]): import('@/pages/hooks/databaseTypes').DatabaseRow[] {
    return rows.map(row => ({
        id: row.id,
        properties: row.cells,
        createdAt: new Date().toISOString(),
        createdBy: '',
        updatedAt: new Date().toISOString(),
        updatedBy: '',
    }));
}

// Main Component (refactored to use InlineDatabaseContainer)
const InlineDatabaseComponent: React.FC<NodeViewProps> = ({
    node,
    updateAttributes,
    selected,
    deleteNode,
    extension,
}) => {
    const { title, columns: savedColumns, rows: savedRows } = node.attrs;

    const [columns, setColumns] = useState<InlineColumn[]>(
        savedColumns ? JSON.parse(savedColumns) : defaultColumns
    );
    const [rows, setRows] = useState<InlineRow[]>(
        savedRows ? JSON.parse(savedRows) : defaultRows
    );

    const saveChanges = useCallback((newColumns: InlineColumn[], newRows: InlineRow[]) => {
        updateAttributes({
            columns: JSON.stringify(newColumns),
            rows: JSON.stringify(newRows),
        });
        const options = extension.options as InlineDatabaseOptions;
        options.onDatabaseChange?.(node.attrs.databaseId, newColumns, newRows);
    }, [updateAttributes, extension.options, node.attrs.databaseId]);

    // Handlers that bridge InlineDatabaseContainer → internal state
    const handleTitleChange = useCallback((newTitle: string) => {
        updateAttributes({ title: newTitle });
    }, [updateAttributes]);

    const handleUpdateCell = useCallback((rowId: string, propertyId: string, value: unknown) => {
        const newRows = rows.map(row =>
            row.id === rowId ? { ...row, cells: { ...row.cells, [propertyId]: value } } : row
        );
        setRows(newRows);
        saveChanges(columns, newRows);
    }, [rows, columns, saveChanges]);

    const handleAddRow = useCallback(() => {
        const newRow: InlineRow = {
            id: generateId(),
            cells: columns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}),
        };
        const newRows = [...rows, newRow];
        setRows(newRows);
        saveChanges(columns, newRows);
    }, [rows, columns, saveChanges]);

    const handleDeleteRow = useCallback((rowId: string) => {
        const newRows = rows.filter(row => row.id !== rowId);
        setRows(newRows);
        saveChanges(columns, newRows);
    }, [rows, columns, saveChanges]);

    const handleAddProperty = useCallback((type: string) => {
        const newColumn: InlineColumn = {
            id: generateId(),
            name: `Column ${columns.length + 1}`,
            type: type as InlineColumn['type'],
            width: 120,
            ...(type === 'select' ? {
                options: [{ id: generateId(), name: 'Option 1', color: selectColors[0] }]
            } : {}),
        };
        const newColumns = [...columns, newColumn];
        setColumns(newColumns);
        saveChanges(newColumns, rows);
    }, [columns, rows, saveChanges]);

    const handleAddSelectOption = useCallback(async (propertyId: string, name: string) => {
        const col = columns.find(c => c.id === propertyId);
        if (!col) return undefined;
        const newOption = { id: generateId(), name, color: selectColors[(col.options?.length || 0) % selectColors.length] };
        const updatedCol = { ...col, options: [...(col.options || []), newOption] };
        const newColumns = columns.map(c => c.id === propertyId ? updatedCol : c);
        setColumns(newColumns);
        saveChanges(newColumns, rows);
        return newOption;
    }, [columns, rows, saveChanges]);

    return (
        <NodeViewWrapper>
            <div className={`my-4 ${selected ? 'ring-2 ring-primary rounded-xl' : ''}`}>
                <InlineDatabaseContainer
                    title={title || 'Untitled Database'}
                    properties={toDbProperties(columns)}
                    rows={toDbRows(rows)}
                    onTitleChange={handleTitleChange}
                    onUpdateCell={handleUpdateCell}
                    onAddRow={handleAddRow}
                    onDeleteRow={handleDeleteRow}
                    onAddProperty={handleAddProperty}
                    onAddSelectOption={handleAddSelectOption}
                    compact
                />
            </div>
        </NodeViewWrapper>
    );
};

export const InlineDatabase = Node.create<InlineDatabaseOptions>({
    name: 'inlineDatabase',

    group: 'block',

    atom: true,

    addOptions() {
        return {
            onDatabaseChange: undefined,
        };
    },

    addAttributes() {
        return {
            databaseId: { default: () => generateId() },
            title: { default: 'Untitled Database' },
            columns: { default: null },
            rows: { default: null },
        };
    },

    parseHTML() {
        return [{ tag: 'div[data-type="inline-database"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-database' })];
    },

    addNodeView() {
        return ReactNodeViewRenderer(InlineDatabaseComponent);
    },
});

export default InlineDatabase;
