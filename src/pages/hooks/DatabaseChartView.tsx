import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { BarChart3, PieChart, TrendingUp, ChevronDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DatabaseRow, DatabaseProperty } from './databaseTypes';

type ChartType = 'bar' | 'line' | 'donut';

interface DatabaseChartViewProps {
    rows: DatabaseRow[];
    properties: DatabaseProperty[];
}

export function DatabaseChartView({ rows, properties }: DatabaseChartViewProps) {
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [xAxisPropId, setXAxisPropId] = useState<string>(
        () => properties.find(p => p.type === 'select' || p.type === 'status')?.id || properties[0]?.id || ''
    );
    const [yAxisMode, setYAxisMode] = useState<'count' | 'sum'>('count');
    const [yAxisPropId, setYAxisPropId] = useState<string>(
        () => properties.find(p => p.type === 'number')?.id || ''
    );

    const xProp = properties.find(p => p.id === xAxisPropId);
    const categorizable = properties.filter(p => ['select', 'status', 'multi_select', 'checkbox', 'person'].includes(p.type));
    const numericProps = properties.filter(p => p.type === 'number');

    // Calculate chart data
    const chartData = useMemo(() => {
        if (!xProp) return [];

        if (xProp.type === 'select' || xProp.type === 'status') {
            return (xProp.options || []).map(option => {
                const matchingRows = rows.filter(r => r.properties[xProp.id] === option.id);
                const value = yAxisMode === 'count'
                    ? matchingRows.length
                    : matchingRows.reduce((sum, r) => sum + (Number(r.properties[yAxisPropId]) || 0), 0);
                return { label: option.name, value, color: option.color };
            });
        }

        if (xProp.type === 'checkbox') {
            const checked = rows.filter(r => r.properties[xProp.id] === true);
            const unchecked = rows.filter(r => !r.properties[xProp.id]);
            return [
                { label: 'Checked', value: checked.length, color: '#22c55e' },
                { label: 'Unchecked', value: unchecked.length, color: '#ef4444' },
            ];
        }

        // Fallback: group by unique values
        const groups = new Map<string, number>();
        rows.forEach(r => {
            const val = String(r.properties[xProp.id] || 'Empty');
            groups.set(val, (groups.get(val) || 0) + 1);
        });
        const colors = ['#3b82f6', '#ef4444', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308'];
        return Array.from(groups.entries()).map(([label, value], i) => ({
            label, value, color: colors[i % colors.length],
        }));
    }, [rows, xProp, yAxisMode, yAxisPropId]);

    const maxValue = Math.max(...chartData.map(d => d.value), 1);
    const total = chartData.reduce((s, d) => s + d.value, 0);

    return (
        <div className="border rounded-lg border-white/10 overflow-hidden">
            {/* Config bar */}
            <div className="flex items-center gap-3 p-3 bg-white/[0.02] border-b border-white/10">
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                    <button onClick={() => setChartType('bar')} className={cn("p-1.5 rounded", chartType === 'bar' && "bg-white/10")}>
                        <BarChart3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setChartType('line')} className={cn("p-1.5 rounded", chartType === 'line' && "bg-white/10")}>
                        <TrendingUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => setChartType('donut')} className={cn("p-1.5 rounded", chartType === 'donut' && "bg-white/10")}>
                        <PieChart className="h-4 w-4" />
                    </button>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs h-8">
                            X: {xProp?.name || 'Select'} <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {properties.map(p => (
                            <DropdownMenuItem key={p.id} onClick={() => setXAxisPropId(p.id)}>{p.name}</DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs h-8">
                            Y: {yAxisMode === 'count' ? 'Count' : `Sum(${numericProps.find(p => p.id === yAxisPropId)?.name || '?'})`}
                            <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setYAxisMode('count')}>Count</DropdownMenuItem>
                        {numericProps.map(p => (
                            <DropdownMenuItem key={p.id} onClick={() => { setYAxisMode('sum'); setYAxisPropId(p.id); }}>
                                Sum of {p.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Chart area */}
            <div className="p-6">
                {chartData.length === 0 ? (
                    <div className="text-center text-slate-500 py-12">No data to display</div>
                ) : chartType === 'bar' ? (
                    <BarChartRenderer data={chartData} maxValue={maxValue} />
                ) : chartType === 'line' ? (
                    <LineChartRenderer data={chartData} maxValue={maxValue} />
                ) : (
                    <DonutChartRenderer data={chartData} total={total} />
                )}
            </div>
        </div>
    );
}

// ── Bar Chart (CSS-based) ──────────────────────────────────
function BarChartRenderer({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) {
    return (
        <div className="space-y-3">
            {data.map((d, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-24 truncate text-right">{d.label}</span>
                    <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden relative">
                        <div
                            className="h-full rounded-lg transition-all duration-500 flex items-center px-2"
                            style={{ width: `${Math.max(2, (d.value / maxValue) * 100)}%`, backgroundColor: d.color + '40' }}
                        >
                            <span className="text-xs font-medium" style={{ color: d.color }}>{d.value}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Line Chart (SVG) ───────────────────────────────────────
function LineChartRenderer({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) {
    const w = 500, h = 200, pad = 30;
    const points = data.map((d, i) => ({
        x: pad + (i / Math.max(data.length - 1, 1)) * (w - 2 * pad),
        y: h - pad - (d.value / maxValue) * (h - 2 * pad),
        ...d,
    }));
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 250 }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                <line key={pct} x1={pad} y1={h - pad - pct * (h - 2 * pad)} x2={w - pad} y2={h - pad - pct * (h - 2 * pad)}
                    stroke="rgba(255,255,255,0.05)" />
            ))}
            {/* Line */}
            <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Area */}
            <path d={`${pathD} L ${points[points.length - 1]?.x || pad} ${h - pad} L ${pad} ${h - pad} Z`}
                fill="url(#lineGrad)" opacity="0.3" />
            <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Dots + labels */}
            {points.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4" fill={p.color} />
                    <text x={p.x} y={h - 8} textAnchor="middle" className="text-[9px] fill-slate-400">{p.label}</text>
                    <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[9px] fill-slate-300">{p.value}</text>
                </g>
            ))}
        </svg>
    );
}

// ── Donut Chart (SVG) ──────────────────────────────────────
function DonutChartRenderer({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
    const size = 200, cx = size / 2, cy = size / 2, r = 70, strokeWidth = 28;
    let accAngle = -90;

    const segments = data.map(d => {
        const angle = (d.value / Math.max(total, 1)) * 360;
        const start = accAngle;
        accAngle += angle;
        return { ...d, startAngle: start, angle };
    });

    const polarToCartesian = (angle: number) => ({
        x: cx + r * Math.cos((angle * Math.PI) / 180),
        y: cy + r * Math.sin((angle * Math.PI) / 180),
    });

    return (
        <div className="flex items-center gap-8 justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {segments.map((seg, i) => {
                    const start = polarToCartesian(seg.startAngle);
                    const end = polarToCartesian(seg.startAngle + seg.angle);
                    const large = seg.angle > 180 ? 1 : 0;
                    const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
                    return <path key={i} d={d} fill="none" stroke={seg.color} strokeWidth={strokeWidth} strokeLinecap="round" />;
                })}
                <text x={cx} y={cy - 5} textAnchor="middle" className="text-2xl font-bold fill-white">{total}</text>
                <text x={cx} y={cy + 15} textAnchor="middle" className="text-[10px] fill-slate-400">Total</text>
            </svg>
            <div className="space-y-2">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-slate-300">{d.label}</span>
                        <span className="text-slate-500 ml-auto">{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
