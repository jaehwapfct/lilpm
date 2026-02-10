import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    format, startOfWeek, endOfWeek, addWeeks, subWeeks,
    eachDayOfInterval, differenceInDays, isSameDay, isWithinInterval,
    startOfMonth, endOfMonth, addMonths, subMonths, eachWeekOfInterval
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { DatabaseRow, DatabaseProperty } from './databaseTypes';

type TimeScale = 'week' | 'month' | 'quarter';

interface DatabaseTimelineViewProps {
    rows: DatabaseRow[];
    properties: DatabaseProperty[];
    onRowClick: (row: DatabaseRow) => void;
}

export function DatabaseTimelineView({ rows, properties, onRowClick }: DatabaseTimelineViewProps) {
    const [scale, setScale] = useState<TimeScale>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const dateProperty = properties.find(p => p.type === 'date');
    const titleProperty = properties.find(p => p.name.toLowerCase() === 'title' || p.name.toLowerCase() === 'name')
        || properties.find(p => p.type === 'text') || properties[0];

    // Calculate visible date range
    const { startDate, endDate, days } = useMemo(() => {
        let start: Date, end: Date;
        if (scale === 'week') {
            start = startOfWeek(currentDate);
            end = endOfWeek(addWeeks(currentDate, 1));
        } else if (scale === 'month') {
            start = startOfMonth(currentDate);
            end = endOfMonth(currentDate);
        } else {
            start = startOfMonth(currentDate);
            end = endOfMonth(addMonths(currentDate, 2));
        }
        return { startDate: start, endDate: end, days: eachDayOfInterval({ start, end }) };
    }, [currentDate, scale]);

    const totalDays = days.length;

    // Map rows to timeline bars
    const timelineItems = useMemo(() => {
        if (!dateProperty) return [];
        return rows.map(row => {
            const dateVal = row.properties[dateProperty.id];
            if (!dateVal) return null;
            try {
                const d = new Date(dateVal as string);
                if (isNaN(d.getTime())) return null;
                const startOffset = differenceInDays(d, startDate);
                const selectProp = properties.find(p => p.type === 'select' || p.type === 'status');
                const selectVal = selectProp ? row.properties[selectProp.id] : null;
                const option = selectProp?.options?.find(o => o.id === selectVal);
                return {
                    row,
                    date: d,
                    offset: Math.max(0, startOffset),
                    duration: 1,
                    color: option?.color || '#3b82f6',
                    title: titleProperty ? (row.properties[titleProperty.id] as string) || 'Untitled' : 'Untitled',
                    isVisible: startOffset >= 0 && startOffset < totalDays,
                };
            } catch { return null; }
        }).filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.map>[number]>[];
    }, [rows, dateProperty, titleProperty, properties, startDate, totalDays]);

    const navigate = (dir: number) => {
        if (scale === 'week') setCurrentDate(dir > 0 ? addWeeks(currentDate, 2) : subWeeks(currentDate, 2));
        else if (scale === 'month') setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
        else setCurrentDate(dir > 0 ? addMonths(currentDate, 3) : subMonths(currentDate, 3));
    };

    if (!dateProperty) {
        return (
            <div className="flex flex-col items-center justify-center text-slate-400 p-12 border rounded-lg border-dashed border-white/10">
                <div className="text-4xl mb-3">📅</div>
                <p className="font-medium mb-1">No date property found</p>
                <p className="text-sm text-slate-500">Add a date property to use Timeline view.</p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-white/[0.02] border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="font-semibold">
                        {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                    {(['week', 'month', 'quarter'] as TimeScale[]).map(s => (
                        <button
                            key={s}
                            onClick={() => setScale(s)}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                                scale === s ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                            )}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Day headers */}
            <div className="flex border-b border-white/10 overflow-x-auto">
                <div className="w-48 flex-shrink-0 p-2 border-r border-white/10 text-xs font-medium text-slate-400">
                    Items
                </div>
                <div className="flex flex-1">
                    {days.map((day, i) => (
                        <div
                            key={i}
                            className={cn(
                                "flex-1 min-w-[30px] p-1 text-center text-[10px] border-r border-white/5",
                                isSameDay(day, new Date()) && "bg-primary/10",
                                day.getDay() === 0 || day.getDay() === 6 ? "text-slate-600" : "text-slate-400"
                            )}
                        >
                            <div>{format(day, 'd')}</div>
                            {(i === 0 || day.getDate() === 1) && (
                                <div className="text-[9px] text-slate-500">{format(day, 'MMM')}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Timeline rows */}
            <div className="max-h-[400px] overflow-y-auto">
                {timelineItems.map((item, idx) => (
                    <div key={item.row.id} className="flex border-b border-white/5 hover:bg-white/[0.02]">
                        <div className="w-48 flex-shrink-0 p-2 border-r border-white/10">
                            <button
                                className="text-sm truncate text-left hover:text-primary transition-colors"
                                onClick={() => onRowClick(item.row)}
                            >
                                {item.title}
                            </button>
                        </div>
                        <div className="flex flex-1 relative" style={{ height: 36 }}>
                            {item.isVisible && (
                                <div
                                    className="absolute top-1 h-7 rounded-md flex items-center px-2 text-[10px] font-medium cursor-pointer hover:brightness-125 transition-all truncate"
                                    style={{
                                        left: `${(item.offset / totalDays) * 100}%`,
                                        width: `${Math.max(2, (item.duration / totalDays) * 100)}%`,
                                        backgroundColor: item.color + '30',
                                        borderLeft: `3px solid ${item.color}`,
                                        color: item.color,
                                    }}
                                    onClick={() => onRowClick(item.row)}
                                >
                                    {item.title}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {timelineItems.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-8">
                        No items with dates in this range
                    </div>
                )}
            </div>
        </div>
    );
}
