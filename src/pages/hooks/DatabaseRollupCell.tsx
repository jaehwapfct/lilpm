import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown } from 'lucide-react';
import type { Database, DatabaseRow, DatabaseProperty } from './databaseTypes';

export type RollupAggregation = 'show_original' | 'count' | 'count_values' | 'count_unique'
    | 'sum' | 'average' | 'min' | 'max' | 'percent_checked' | 'percent_unchecked';

interface DatabaseRollupCellProps {
    /** The relation property that this rollup is based on */
    relationProperty: DatabaseProperty | null;
    /** The property to aggregate from the related database */
    targetPropertyId: string | null;
    /** The aggregation type */
    aggregation: RollupAggregation;
    /** Current row */
    row: DatabaseRow;
    /** The related database */
    relatedDatabase: Database | null;
}

export function DatabaseRollupCell({
    relationProperty,
    targetPropertyId,
    aggregation,
    row,
    relatedDatabase,
}: DatabaseRollupCellProps) {
    const result = useMemo(() => {
        if (!relationProperty || !relatedDatabase || !targetPropertyId) {
            return { display: '-', type: 'empty' as const };
        }

        // Get related row IDs from the relation property
        const relatedIds = (row.properties[relationProperty.id] as string[]) || [];
        if (relatedIds.length === 0) {
            return { display: '-', type: 'empty' as const };
        }

        // Get the related rows
        const relatedRows = relatedDatabase.rows.filter(r => relatedIds.includes(r.id));
        const targetProp = relatedDatabase.properties.find(p => p.id === targetPropertyId);
        if (!targetProp) return { display: '-', type: 'empty' as const };

        // Get values from the target property
        const values = relatedRows.map(r => r.properties[targetPropertyId]);
        const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== '');

        switch (aggregation) {
            case 'show_original': {
                return {
                    display: nonEmpty.map(v => formatValue(v, targetProp)).join(', '),
                    type: 'text' as const,
                };
            }
            case 'count':
                return { display: values.length.toString(), type: 'number' as const };
            case 'count_values':
                return { display: nonEmpty.length.toString(), type: 'number' as const };
            case 'count_unique': {
                const unique = new Set(nonEmpty.map(v => JSON.stringify(v)));
                return { display: unique.size.toString(), type: 'number' as const };
            }
            case 'sum': {
                const nums = nonEmpty.map(Number).filter(n => !isNaN(n));
                return { display: nums.reduce((a, b) => a + b, 0).toLocaleString(), type: 'number' as const };
            }
            case 'average': {
                const nums = nonEmpty.map(Number).filter(n => !isNaN(n));
                const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
                return { display: avg.toLocaleString(undefined, { maximumFractionDigits: 2 }), type: 'number' as const };
            }
            case 'min': {
                const nums = nonEmpty.map(Number).filter(n => !isNaN(n));
                return { display: nums.length > 0 ? Math.min(...nums).toLocaleString() : '-', type: 'number' as const };
            }
            case 'max': {
                const nums = nonEmpty.map(Number).filter(n => !isNaN(n));
                return { display: nums.length > 0 ? Math.max(...nums).toLocaleString() : '-', type: 'number' as const };
            }
            case 'percent_checked': {
                const total = values.length;
                const checked = values.filter(v => v === true).length;
                return { display: total > 0 ? Math.round((checked / total) * 100) + '%' : '0%', type: 'number' as const };
            }
            case 'percent_unchecked': {
                const total = values.length;
                const unchecked = values.filter(v => v !== true).length;
                return { display: total > 0 ? Math.round((unchecked / total) * 100) + '%' : '0%', type: 'number' as const };
            }
            default:
                return { display: '-', type: 'empty' as const };
        }
    }, [relationProperty, targetPropertyId, aggregation, row, relatedDatabase]);

    if (result.type === 'empty') {
        return (
            <div className="min-h-[32px] flex items-center px-1">
                <span className="text-sm text-slate-500">
                    <ArrowUpDown className="h-3.5 w-3.5 inline mr-1" />
                    {!relationProperty ? 'No relation' : '-'}
                </span>
            </div>
        );
    }

    return (
        <div className="min-h-[32px] flex items-center px-1">
            <span className="text-sm text-slate-300">{result.display}</span>
        </div>
    );
}

function formatValue(value: unknown, prop: DatabaseProperty): string {
    if (value === null || value === undefined) return '';
    if (prop.type === 'select' || prop.type === 'status') {
        const option = prop.options?.find(o => o.id === value);
        return option?.name || String(value);
    }
    if (prop.type === 'checkbox') return value ? '✓' : '✗';
    return String(value);
}

// ── Rollup Aggregation Options ─────────────────────────────
export const ROLLUP_AGGREGATIONS: { value: RollupAggregation; label: string }[] = [
    { value: 'show_original', label: 'Show original' },
    { value: 'count', label: 'Count all' },
    { value: 'count_values', label: 'Count values' },
    { value: 'count_unique', label: 'Count unique' },
    { value: 'sum', label: 'Sum' },
    { value: 'average', label: 'Average' },
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
    { value: 'percent_checked', label: '% Checked' },
    { value: 'percent_unchecked', label: '% Unchecked' },
];
