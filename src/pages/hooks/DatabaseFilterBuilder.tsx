import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Filter, Plus, X, ChevronDown, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DatabaseProperty, FilterCondition, FilterGroup, FilterOperator } from './databaseTypes';
import { OPERATORS_BY_TYPE, PROPERTY_ICONS } from './databaseTypes';

interface DatabaseFilterBuilderProps {
    properties: DatabaseProperty[];
    filterGroup: FilterGroup;
    onFilterChange: (group: FilterGroup) => void;
    activeFilterCount: number;
}

export function DatabaseFilterBuilder({
    properties,
    filterGroup,
    onFilterChange,
    activeFilterCount,
}: DatabaseFilterBuilderProps) {
    const [open, setOpen] = useState(false);

    const filterableProperties = properties.filter(
        p => !['created_by', 'last_edited_by', 'formula', 'relation', 'rollup', 'files'].includes(p.type)
    );

    const addCondition = () => {
        if (filterableProperties.length === 0) return;
        const firstProp = filterableProperties[0];
        const operators = OPERATORS_BY_TYPE[firstProp.type] || OPERATORS_BY_TYPE['text'];
        const newCondition: FilterCondition = {
            id: Date.now().toString(),
            propertyId: firstProp.id,
            operator: operators[0].value,
            value: null,
        };
        onFilterChange({
            ...filterGroup,
            conditions: [...filterGroup.conditions, newCondition],
        });
    };

    const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
        onFilterChange({
            ...filterGroup,
            conditions: filterGroup.conditions.map(c =>
                c.id === id ? { ...c, ...updates } : c
            ),
        });
    };

    const removeCondition = (id: string) => {
        onFilterChange({
            ...filterGroup,
            conditions: filterGroup.conditions.filter(c => c.id !== id),
        });
    };

    const toggleCombinator = () => {
        onFilterChange({
            ...filterGroup,
            combinator: filterGroup.combinator === 'and' ? 'or' : 'and',
        });
    };

    const clearAll = () => {
        onFilterChange({ combinator: 'and', conditions: [] });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(activeFilterCount > 0 && "border-primary text-primary")}>
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[520px] p-0" align="end">
                <div className="p-3 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Filters</span>
                        {filterGroup.conditions.length > 0 && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400" onClick={clearAll}>
                                Clear all
                            </Button>
                        )}
                    </div>
                </div>

                <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                    {filterGroup.conditions.length === 0 ? (
                        <div className="text-center text-slate-400 text-sm py-4">
                            No filters applied. Click + to add one.
                        </div>
                    ) : (
                        filterGroup.conditions.map((condition, index) => {
                            const property = properties.find(p => p.id === condition.propertyId);
                            const operators = OPERATORS_BY_TYPE[property?.type || 'text'] || OPERATORS_BY_TYPE['text'];
                            const needsValue = !['is_empty', 'is_not_empty'].includes(condition.operator);

                            return (
                                <div key={condition.id} className="flex items-center gap-2">
                                    {/* Combinator label */}
                                    <div className="w-12 flex-shrink-0 text-right">
                                        {index === 0 ? (
                                            <span className="text-xs text-slate-400">Where</span>
                                        ) : (
                                            <button
                                                onClick={toggleCombinator}
                                                className="text-xs text-primary hover:text-primary/80 font-medium"
                                            >
                                                {filterGroup.combinator.toUpperCase()}
                                            </button>
                                        )}
                                    </div>

                                    {/* Property selector */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8 min-w-[100px] justify-between text-xs">
                                                <span className="truncate">{property?.name || 'Select'}</span>
                                                <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {filterableProperties.map(prop => (
                                                <DropdownMenuItem
                                                    key={prop.id}
                                                    onClick={() => {
                                                        const newOps = OPERATORS_BY_TYPE[prop.type] || OPERATORS_BY_TYPE['text'];
                                                        updateCondition(condition.id, {
                                                            propertyId: prop.id,
                                                            operator: newOps[0].value,
                                                            value: null,
                                                        });
                                                    }}
                                                >
                                                    {React.createElement(PROPERTY_ICONS[prop.type], { className: 'h-3.5 w-3.5 mr-2 text-slate-400' })}
                                                    {prop.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Operator selector */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8 min-w-[90px] justify-between text-xs">
                                                <span className="truncate">
                                                    {operators.find(o => o.value === condition.operator)?.label || condition.operator}
                                                </span>
                                                <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {operators.map(op => (
                                                <DropdownMenuItem
                                                    key={op.value}
                                                    onClick={() => updateCondition(condition.id, { operator: op.value })}
                                                >
                                                    {op.label}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Value input */}
                                    {needsValue && (
                                        <FilterValueInput
                                            property={property}
                                            value={condition.value}
                                            onChange={(val) => updateCondition(condition.id, { value: val })}
                                        />
                                    )}

                                    {/* Remove button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 flex-shrink-0 text-slate-400 hover:text-destructive"
                                        onClick={() => removeCondition(condition.id)}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-3 border-t border-white/10">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={addCondition}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add filter
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// ── Filter Value Input ─────────────────────────────────────
function FilterValueInput({
    property,
    value,
    onChange,
}: {
    property: DatabaseProperty | undefined;
    value: unknown;
    onChange: (val: unknown) => void;
}) {
    if (!property) return null;

    switch (property.type) {
        case 'select':
        case 'status': {
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 min-w-[100px] justify-between text-xs">
                            {property.options?.find(o => o.id === value)?.name || 'Select...'}
                            <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {property.options?.map(option => (
                            <DropdownMenuItem key={option.id} onClick={() => onChange(option.id)}>
                                <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: option.color }} />
                                {option.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        }

        case 'multi_select': {
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 min-w-[100px] justify-between text-xs">
                            {property.options?.find(o => o.id === value)?.name || 'Select...'}
                            <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {property.options?.map(option => (
                            <DropdownMenuItem key={option.id} onClick={() => onChange(option.id)}>
                                <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: option.color }} />
                                {option.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        }

        case 'checkbox': {
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 min-w-[80px] justify-between text-xs">
                            {value === true ? 'Checked' : value === false ? 'Unchecked' : 'Select...'}
                            <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onChange(true)}>Checked</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onChange(false)}>Unchecked</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        }

        case 'date':
        case 'created_time':
        case 'last_edited_time': {
            return <DateFilterInput value={value as string} onChange={onChange} />;
        }

        case 'number': {
            return (
                <Input
                    type="number"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="Value..."
                    className="h-8 w-24 text-xs bg-transparent"
                />
            );
        }

        default: {
            return (
                <Input
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value || null)}
                    placeholder="Value..."
                    className="h-8 flex-1 min-w-[100px] text-xs bg-transparent"
                />
            );
        }
    }
}

// ── Date Filter Input ──────────────────────────────────────
function DateFilterInput({ value, onChange }: { value: string; onChange: (v: unknown) => void }) {
    const [open, setOpen] = useState(false);
    const dateValue = value ? new Date(value) : undefined;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 min-w-[120px] justify-between text-xs">
                    <CalendarIcon className="h-3 w-3 mr-1.5" />
                    {dateValue ? format(dateValue, 'MMM d, yyyy') : 'Pick date...'}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={dateValue}
                    onSelect={(date) => {
                        onChange(date ? date.toISOString() : null);
                        setOpen(false);
                    }}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    );
}

// ── Filter Evaluation Logic ────────────────────────────────
export function evaluateFilterGroup(
    row: Record<string, unknown>,
    filterGroup: FilterGroup,
    properties: DatabaseProperty[],
): boolean {
    if (filterGroup.conditions.length === 0) return true;

    const results = filterGroup.conditions.map(condition => {
        const property = properties.find(p => p.id === condition.propertyId);
        if (!property) return true;

        const cellValue = row[condition.propertyId];
        return evaluateCondition(cellValue, condition.operator, condition.value, property);
    });

    return filterGroup.combinator === 'and'
        ? results.every(Boolean)
        : results.some(Boolean);
}

function evaluateCondition(
    cellValue: unknown,
    operator: FilterOperator,
    filterValue: unknown,
    property: DatabaseProperty,
): boolean {
    const isEmpty = cellValue === null || cellValue === undefined || cellValue === '' ||
        (Array.isArray(cellValue) && cellValue.length === 0);

    // Empty/not-empty checks
    if (operator === 'is_empty') return isEmpty;
    if (operator === 'is_not_empty') return !isEmpty;

    // For types that compare directly
    switch (property.type) {
        case 'text':
        case 'email':
        case 'phone':
        case 'url': {
            const str = String(cellValue || '').toLowerCase();
            const filter = String(filterValue || '').toLowerCase();
            switch (operator) {
                case 'contains': return str.includes(filter);
                case 'not_contains': return !str.includes(filter);
                case 'equals': return str === filter;
                case 'not_equals': return str !== filter;
                case 'starts_with': return str.startsWith(filter);
                case 'ends_with': return str.endsWith(filter);
                default: return true;
            }
        }

        case 'number': {
            const num = Number(cellValue);
            const filterNum = Number(filterValue);
            if (isNaN(num) || isNaN(filterNum)) return false;
            switch (operator) {
                case 'equals': return num === filterNum;
                case 'not_equals': return num !== filterNum;
                case 'greater_than': return num > filterNum;
                case 'less_than': return num < filterNum;
                case 'greater_equal': return num >= filterNum;
                case 'less_equal': return num <= filterNum;
                default: return true;
            }
        }

        case 'select':
        case 'status':
        case 'person': {
            switch (operator) {
                case 'equals': return cellValue === filterValue;
                case 'not_equals': return cellValue !== filterValue;
                default: return true;
            }
        }

        case 'multi_select': {
            const ids = (cellValue as string[]) || [];
            switch (operator) {
                case 'contains': return ids.includes(filterValue as string);
                case 'not_contains': return !ids.includes(filterValue as string);
                default: return true;
            }
        }

        case 'date':
        case 'created_time':
        case 'last_edited_time': {
            if (!cellValue || !filterValue) return false;
            const cellDate = new Date(cellValue as string).getTime();
            const filterDate = new Date(filterValue as string).getTime();
            switch (operator) {
                case 'equals': {
                    // Compare dates (same day)
                    const cd = new Date(cellValue as string);
                    const fd = new Date(filterValue as string);
                    return cd.toDateString() === fd.toDateString();
                }
                case 'is_before': return cellDate < filterDate;
                case 'is_after': return cellDate > filterDate;
                default: return true;
            }
        }

        case 'checkbox': {
            const boolVal = Boolean(cellValue);
            return operator === 'equals' ? boolVal === Boolean(filterValue) : true;
        }

        default:
            return true;
    }
}
