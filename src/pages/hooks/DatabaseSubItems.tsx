import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Plus, ChevronRight, ChevronDown, MoreHorizontal, Trash2, Copy, ExternalLink, CornerDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditableCell } from './EditableCell';
import { PROPERTY_ICONS } from './databaseTypes';
import { Type } from 'lucide-react';
import type { DatabaseRow, DatabaseProperty } from './databaseTypes';

interface TreeRow extends DatabaseRow {
    parentId?: string | null;
    depth: number;
    children: TreeRow[];
    hasChildren: boolean;
}

interface DatabaseSubItemsTableProps {
    rows: DatabaseRow[];
    properties: DatabaseProperty[];
    visibleProperties: string[];
    onUpdateCell: (rowId: string, propertyId: string, value: unknown) => void;
    onAddSelectOption: (propertyId: string, name: string) => Promise<{ id: string; name: string; color: string } | undefined>;
    onAddRow: () => void;
    onAddSubItem: (parentId: string) => void;
    onDeleteRow: (rowId: string) => void;
    onDuplicateRow: (rowId: string) => void;
    onRowClick: (row: DatabaseRow) => void;
    onAddProperty: (type: string) => void;
}

export function DatabaseSubItemsTable({
    rows,
    properties,
    visibleProperties,
    onUpdateCell,
    onAddSelectOption,
    onAddRow,
    onAddSubItem,
    onDeleteRow,
    onDuplicateRow,
    onRowClick,
    onAddProperty,
}: DatabaseSubItemsTableProps) {
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

    const displayProperties = properties.filter(p => visibleProperties.includes(p.id));

    // Build tree structure
    const treeRows = useMemo(() => {
        const rowMap = new Map<string, DatabaseRow>();
        rows.forEach(r => rowMap.set(r.id, r));

        const buildTree = (parentId: string | null, depth: number): TreeRow[] => {
            return rows
                .filter(r => {
                    const pid = (r as unknown as { parentId?: string }).parentId;
                    return parentId === null ? !pid : pid === parentId;
                })
                .map(r => {
                    const children = buildTree(r.id, depth + 1);
                    return {
                        ...r,
                        parentId: (r as unknown as { parentId?: string }).parentId || null,
                        depth,
                        children,
                        hasChildren: children.length > 0,
                    };
                });
        };

        return buildTree(null, 0);
    }, [rows]);

    // Flatten tree for rendering (respecting collapsed state)
    const flattenedRows = useMemo(() => {
        const result: TreeRow[] = [];
        const flatten = (items: TreeRow[]) => {
            for (const item of items) {
                result.push(item);
                if (!collapsedIds.has(item.id) && item.children.length > 0) {
                    flatten(item.children);
                }
            }
        };
        flatten(treeRows);
        return result;
    }, [treeRows, collapsedIds]);

    const toggleCollapse = useCallback((id: string) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    return (
        <div className="border rounded-lg overflow-hidden border-white/10">
            <Table>
                <TableHeader>
                    <TableRow>
                        {displayProperties.map(prop => {
                            const IconComp = PROPERTY_ICONS[prop.type] || Type;
                            return (
                                <TableHead key={prop.id} className="min-w-[150px]">
                                    <div className="flex items-center gap-2">
                                        <IconComp className="h-4 w-4 text-slate-400" />
                                        {prop.name}
                                    </div>
                                </TableHead>
                            );
                        })}
                        <TableHead className="w-[80px]" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {flattenedRows.map(row => (
                        <TableRow key={row.id} className="hover:bg-white/5 group">
                            {displayProperties.map((prop, propIdx) => (
                                <TableCell key={prop.id} className="p-1">
                                    <div className="flex items-center" style={{ paddingLeft: propIdx === 0 ? `${row.depth * 24}px` : 0 }}>
                                        {/* Expand/collapse + sub-item indicator (only on first column) */}
                                        {propIdx === 0 && (
                                            <>
                                                {row.hasChildren ? (
                                                    <button
                                                        onClick={() => toggleCollapse(row.id)}
                                                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 flex-shrink-0 mr-1"
                                                    >
                                                        {collapsedIds.has(row.id) ? (
                                                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                                        ) : (
                                                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                                        )}
                                                    </button>
                                                ) : row.depth > 0 ? (
                                                    <CornerDownRight className="h-3.5 w-3.5 text-slate-500 mr-1 flex-shrink-0" />
                                                ) : (
                                                    <div className="w-5 mr-1 flex-shrink-0" />
                                                )}
                                            </>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <EditableCell
                                                value={row.properties[prop.id]}
                                                property={prop}
                                                onUpdate={(value) => onUpdateCell(row.id, prop.id, value)}
                                                onAddOption={
                                                    ['select', 'multi_select', 'status'].includes(prop.type)
                                                        ? (name) => onAddSelectOption(prop.id, name)
                                                        : undefined
                                                }
                                            />
                                        </div>
                                    </div>
                                </TableCell>
                            ))}
                            <TableCell className="p-1">
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        title="Add sub-item"
                                        onClick={() => onAddSubItem(row.id)}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => onRowClick(row)}>
                                                <ExternalLink className="h-4 w-4 mr-2" /> Open
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onAddSubItem(row.id)}>
                                                <Plus className="h-4 w-4 mr-2" /> Add sub-item
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onDuplicateRow(row.id)}>
                                                <Copy className="h-4 w-4 mr-2" /> Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => onDeleteRow(row.id)}>
                                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {/* Add new top-level row */}
                    <TableRow className="hover:bg-white/5 cursor-pointer" onClick={onAddRow}>
                        <TableCell colSpan={displayProperties.length + 1}>
                            <div className="flex items-center gap-2 text-slate-400">
                                <Plus className="h-4 w-4" /> New item
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
}

// ── Utility: Count sub-items ───────────────────────────────
export function countSubItems(rows: DatabaseRow[], parentId: string): number {
    return rows.filter(r => (r as unknown as { parentId?: string }).parentId === parentId).length;
}
