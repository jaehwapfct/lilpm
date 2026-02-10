import React, { useState, useMemo } from 'react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DatabaseRow, DatabaseProperty } from './databaseTypes';

export type AggregationType = 'none' | 'count_all' | 'count_values' | 'count_unique' | 'count_empty'
    | 'percent_empty' | 'percent_not_empty'
    | 'sum' | 'average' | 'median' | 'min' | 'max' | 'range';

const TEXT_AGGREGATIONS: { value: AggregationType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'count_all', label: 'Count all' },
    { value: 'count_values', label: 'Count values' },
    { value: 'count_unique', label: 'Count unique' },
    { value: 'count_empty', label: 'Count empty' },
    { value: 'percent_empty', label: '% Empty' },
    { value: 'percent_not_empty', label: '% Not empty' },
];

const NUMBER_AGGREGATIONS: { value: AggregationType; label: string }[] = [
    ...TEXT_AGGREGATIONS,
    { value: 'sum', label: 'Sum' },
    { value: 'average', label: 'Average' },
    { value: 'median', label: 'Median' },
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
    { value: 'range', label: 'Range' },
];

const CHECKBOX_AGGREGATIONS: { value: AggregationType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'count_all', label: 'Count all' },
    { value: 'count_values', label: 'Checked' },
    { value: 'count_empty', label: 'Unchecked' },
    { value: 'percent_not_empty', label: '% Checked' },
    { value: 'percent_empty', label: '% Unchecked' },
];

function getAggregations(type: string) {
    if (type === 'number') return NUMBER_AGGREGATIONS;
    if (type === 'checkbox') return CHECKBOX_AGGREGATIONS;
    return TEXT_AGGREGATIONS;
}

interface DatabaseSummaryRowProps {
    rows: DatabaseRow[];
    properties: DatabaseProperty[];
    visibleProperties: string[];
}

export function DatabaseSummaryRow({ rows, properties, visibleProperties }: DatabaseSummaryRowProps) {
    const [aggregations, setAggregations] = useState<Record<string, AggregationType>>({});

    const hasAny = Object.values(aggregations).some(a => a !== 'none');

    const displayProperties = properties.filter(p => visibleProperties.includes(p.id));

    return (
        <TableRow className={cn("border-t border-white/10 group/summary", !hasAny && "opacity-50 hover:opacity-100")}>
            {displayProperties.map(prop => {
                const aggType = aggregations[prop.id] || 'none';
                const availableAggs = getAggregations(prop.type);

                return (
                    <TableCell key={prop.id} className="p-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="w-full flex items-center gap-1 px-2 py-1.5 rounded hover:bg-white/5 text-xs text-slate-400 transition-colors">
                                    {aggType !== 'none' ? (
                                        <span className="text-slate-300 font-medium">
                                            <AggregatedValue rows={rows} property={prop} type={aggType} />
                                        </span>
                                    ) : (
                                        <span className="opacity-0 group-hover/summary:opacity-100 transition-opacity">Calculate</span>
                                    )}
                                    <ChevronDown className="h-3 w-3 ml-auto flex-shrink-0 opacity-0 group-hover/summary:opacity-100" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {availableAggs.map(agg => (
                                    <DropdownMenuItem
                                        key={agg.value}
                                        onClick={() => setAggregations(prev => ({ ...prev, [prop.id]: agg.value }))}
                                        className={cn(aggType === agg.value && "bg-white/10")}
                                    >
                                        {agg.label}
                                        {aggType === agg.value && agg.value !== 'none' && (
                                            <span className="ml-auto text-xs text-slate-400">
                                                <AggregatedValue rows={rows} property={prop} type={agg.value} />
                                            </span>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                );
            })}
            <TableCell className="p-1" /> {/* Actions column */}
        </TableRow>
    );
}

// ── Aggregated Value Calculator ────────────────────────────
function AggregatedValue({
    rows,
    property,
    type,
}: {
    rows: DatabaseRow[];
    property: DatabaseProperty;
    type: AggregationType;
}) {
    const result = useMemo(() => {
        const values = rows.map(r => r.properties[property.id]);
        const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0));
        const total = values.length;

        switch (type) {
            case 'none':
                return '';
            case 'count_all':
                return total.toString();
            case 'count_values':
                if (property.type === 'checkbox') {
                    return values.filter(v => v === true).length.toString();
                }
                return nonEmpty.length.toString();
            case 'count_unique': {
                const unique = new Set(nonEmpty.map(v => JSON.stringify(v)));
                return unique.size.toString();
            }
            case 'count_empty':
                if (property.type === 'checkbox') {
                    return values.filter(v => !v).length.toString();
                }
                return (total - nonEmpty.length).toString();
            case 'percent_empty': {
                if (total === 0) return '0%';
                const empty = property.type === 'checkbox'
                    ? values.filter(v => !v).length
                    : total - nonEmpty.length;
                return Math.round((empty / total) * 100) + '%';
            }
            case 'percent_not_empty': {
                if (total === 0) return '0%';
                const filled = property.type === 'checkbox'
                    ? values.filter(v => v === true).length
                    : nonEmpty.length;
                return Math.round((filled / total) * 100) + '%';
            }
            case 'sum': {
                const nums = nonEmpty.map(Number).filter(n => !isNaN(n));
                return nums.reduce((a, b) => a + b, 0).toLocaleString();
            }
            case 'average': {
                const nums = nonEmpty.map(Number).filter(n => !isNaN(n));
                if (nums.length === 0) return '0';
                return (nums.reduce((a, b) => a + b, 0) / nums.length).toLocaleString(undefined, { maximumFractionDigits: 2 });
            }
            case 'median': {
                const nums = nonEmpty.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
                if (nums.length === 0) return '0';
                const mid = Math.floor(nums.length / 2);
                return nums.length % 2 ? nums[mid].toString() : ((nums[mid - 1] + nums[mid]) / 2).toString();
            }
            case 'min': {
                const nums = nonEmpty.map(Number).filter(n => !isNaN(n));
                return nums.length ? Math.min(...nums).toLocaleString() : '0';
            }
            case 'max': {
                const nums = nonEmpty.map(Number).filter(n => !isNaN(n));
                return nums.length ? Math.max(...nums).toLocaleString() : '0';
            }
            case 'range': {
                const nums = nonEmpty.map(Number).filter(n => !isNaN(n));
                if (nums.length === 0) return '0';
                return (Math.max(...nums) - Math.min(...nums)).toLocaleString();
            }
            default:
                return '';
        }
    }, [rows, property, type]);

    return <>{result}</>;
}
