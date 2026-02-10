import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Paintbrush, Plus, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DatabaseProperty, ConditionalFormat } from './databaseTypes';
import { PROPERTY_ICONS, OPERATORS_BY_TYPE } from './databaseTypes';
import { Type } from 'lucide-react';

const FORMAT_COLORS = [
    { bg: '#ef444420', text: '#ef4444', label: 'Red' },
    { bg: '#f9731620', text: '#f97316', label: 'Orange' },
    { bg: '#eab30820', text: '#eab308', label: 'Yellow' },
    { bg: '#22c55e20', text: '#22c55e', label: 'Green' },
    { bg: '#3b82f620', text: '#3b82f6', label: 'Blue' },
    { bg: '#8b5cf620', text: '#8b5cf6', label: 'Purple' },
    { bg: '#ec489920', text: '#ec4899', label: 'Pink' },
    { bg: '#64748b20', text: '#64748b', label: 'Gray' },
];

interface DatabaseConditionalFormatProps {
    properties: DatabaseProperty[];
    formats: ConditionalFormat[];
    onFormatsChange: (formats: ConditionalFormat[]) => void;
}

export function DatabaseConditionalFormatButton({
    properties,
    formats,
    onFormatsChange,
}: DatabaseConditionalFormatProps) {
    const [open, setOpen] = useState(false);

    const addFormat = () => {
        const firstProp = properties.find(p => ['text', 'number', 'select', 'status'].includes(p.type));
        if (!firstProp) return;
        const ops = OPERATORS_BY_TYPE[firstProp.type] || OPERATORS_BY_TYPE['text'];
        const newFormat: ConditionalFormat = {
            id: Date.now().toString(),
            propertyId: firstProp.id,
            operator: ops[0]?.value || 'equals',
            value: null,
            color: FORMAT_COLORS[0].bg,
            textColor: FORMAT_COLORS[0].text,
        };
        onFormatsChange([...formats, newFormat]);
    };

    const updateFormat = (id: string, updates: Partial<ConditionalFormat>) => {
        onFormatsChange(formats.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const removeFormat = (id: string) => {
        onFormatsChange(formats.filter(f => f.id !== id));
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(formats.length > 0 && "border-primary text-primary")}>
                    <Paintbrush className="h-4 w-4 mr-2" />
                    Color
                    {formats.length > 0 && <span className="ml-1 text-xs">({formats.length})</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[480px] p-0" align="end">
                <div className="p-3 border-b border-white/10">
                    <span className="text-sm font-medium">Conditional formatting</span>
                </div>

                <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                    {formats.length === 0 ? (
                        <div className="text-center text-sm text-slate-400 py-4">
                            Highlight rows based on conditions
                        </div>
                    ) : (
                        formats.map(fmt => {
                            const prop = properties.find(p => p.id === fmt.propertyId);
                            const ops = OPERATORS_BY_TYPE[prop?.type || 'text'] || OPERATORS_BY_TYPE['text'];

                            return (
                                <div key={fmt.id} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: fmt.color }}>
                                    {/* Property */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-7 text-xs min-w-[80px] bg-black/20 border-white/10">
                                                {prop?.name || 'Select'} <ChevronDown className="h-3 w-3 ml-1" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {properties.map(p => (
                                                <DropdownMenuItem key={p.id} onClick={() => updateFormat(fmt.id, { propertyId: p.id })}>
                                                    {p.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Operator */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-7 text-xs bg-black/20 border-white/10">
                                                {ops.find(o => o.value === fmt.operator)?.label || fmt.operator}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {ops.map(op => (
                                                <DropdownMenuItem key={op.value} onClick={() => updateFormat(fmt.id, { operator: op.value })}>
                                                    {op.label}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Value */}
                                    {!['is_empty', 'is_not_empty'].includes(fmt.operator) && (
                                        <Input
                                            value={String(fmt.value ?? '')}
                                            onChange={(e) => updateFormat(fmt.id, { value: e.target.value || null })}
                                            className="h-7 w-20 text-xs bg-black/20 border-white/10"
                                            placeholder="Value"
                                        />
                                    )}

                                    {/* Color picker */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="w-6 h-6 rounded-full border-2 border-white/20 flex-shrink-0" style={{ backgroundColor: fmt.textColor }} />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <div className="grid grid-cols-4 gap-1 p-1">
                                                {FORMAT_COLORS.map(c => (
                                                    <button
                                                        key={c.label}
                                                        className="w-6 h-6 rounded-full border border-white/10 hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: c.text }}
                                                        onClick={() => updateFormat(fmt.id, { color: c.bg, textColor: c.text })}
                                                    />
                                                ))}
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeFormat(fmt.id)}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-3 border-t border-white/10">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={addFormat}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add rule
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ── Evaluate conditional format for a row ──────────────────
export function getRowFormatStyle(
    row: Record<string, unknown>,
    formats: ConditionalFormat[],
    properties: DatabaseProperty[],
): React.CSSProperties | undefined {
    for (const fmt of formats) {
        const prop = properties.find(p => p.id === fmt.propertyId);
        if (!prop) continue;
        const cellValue = row[fmt.propertyId];
        if (evaluateFormatCondition(cellValue, fmt.operator, fmt.value, prop)) {
            return { backgroundColor: fmt.color };
        }
    }
    return undefined;
}

function evaluateFormatCondition(cellValue: unknown, operator: string, filterValue: unknown, prop: DatabaseProperty): boolean {
    const isEmpty = cellValue === null || cellValue === undefined || cellValue === '';
    if (operator === 'is_empty') return isEmpty;
    if (operator === 'is_not_empty') return !isEmpty;
    if (isEmpty) return false;

    const str = String(cellValue).toLowerCase();
    const filterStr = String(filterValue ?? '').toLowerCase();

    switch (operator) {
        case 'equals': return prop.type === 'number' ? Number(cellValue) === Number(filterValue) : str === filterStr;
        case 'not_equals': return str !== filterStr;
        case 'contains': return str.includes(filterStr);
        case 'not_contains': return !str.includes(filterStr);
        case 'greater_than': return Number(cellValue) > Number(filterValue);
        case 'less_than': return Number(cellValue) < Number(filterValue);
        default: return false;
    }
}
