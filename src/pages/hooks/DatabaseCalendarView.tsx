import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addMonths, subMonths, isSameMonth, isSameDay, eachDayOfInterval
} from 'date-fns';
import { cn } from '@/lib/utils';
import type { DatabaseRow, DatabaseProperty } from './databaseTypes';

interface DatabaseCalendarViewProps {
    rows: DatabaseRow[];
    properties: DatabaseProperty[];
    onRowClick: (row: DatabaseRow) => void;
    onAddRow: () => void;
}

export function DatabaseCalendarView({ rows, properties, onRowClick, onAddRow }: DatabaseCalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Find the first date property
    const dateProperty = properties.find(p => p.type === 'date');
    const titleProperty = properties.find(p => p.name.toLowerCase() === 'title' || p.name.toLowerCase() === 'name')
        || properties.find(p => p.type === 'text')
        || properties[0];

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calStart = startOfWeek(monthStart);
        const calEnd = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: calStart, end: calEnd });
    }, [currentMonth]);

    // Group rows by date
    const rowsByDate = useMemo(() => {
        if (!dateProperty) return new Map<string, DatabaseRow[]>();
        const map = new Map<string, DatabaseRow[]>();
        rows.forEach(row => {
            const dateVal = row.properties[dateProperty.id];
            if (dateVal) {
                try {
                    const d = new Date(dateVal as string);
                    if (!isNaN(d.getTime())) {
                        const dateKey = format(d, 'yyyy-MM-dd');
                        const existing = map.get(dateKey) || [];
                        map.set(dateKey, [...existing, row]);
                    }
                } catch { /* skip invalid dates */ }
            }
        });
        return map;
    }, [rows, dateProperty]);

    if (!dateProperty) {
        return (
            <div className="flex flex-col items-center justify-center text-slate-400 p-12 border rounded-lg border-dashed border-white/10">
                <div className="text-4xl mb-3">📅</div>
                <p className="font-medium mb-1">No date property found</p>
                <p className="text-sm text-slate-500">Add a date property to use Calendar view.</p>
            </div>
        );
    }

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="border rounded-lg overflow-hidden border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-white/[0.02]">
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setCurrentMonth(new Date())}
                    >
                        Today
                    </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-t border-white/10">
                {weekDays.map(day => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-slate-400 border-r border-white/5 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayRows = rowsByDate.get(dateKey) || [];
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentMonth);

                    return (
                        <div
                            key={idx}
                            className={cn(
                                "min-h-[110px] p-1.5 border-r border-b border-white/5 transition-colors hover:bg-white/[0.02]",
                                !isCurrentMonth && "opacity-30 bg-white/[0.01]"
                            )}
                        >
                            {/* Day number */}
                            <div className="flex items-center justify-between mb-1">
                                <span className={cn(
                                    "text-xs w-6 h-6 flex items-center justify-center rounded-full",
                                    isToday && "bg-primary text-white font-bold",
                                    !isToday && "text-slate-400"
                                )}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            {/* Events */}
                            <div className="space-y-0.5">
                                {dayRows.slice(0, 3).map(row => {
                                    const selectProp = properties.find(p => p.type === 'select' || p.type === 'status');
                                    const selectVal = selectProp ? row.properties[selectProp.id] : null;
                                    const option = selectProp?.options?.find(o => o.id === selectVal);
                                    const color = option?.color || '#3b82f6';

                                    return (
                                        <button
                                            key={row.id}
                                            onClick={() => onRowClick(row)}
                                            className="w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate hover:brightness-125 transition-all"
                                            style={{ backgroundColor: color + '20', borderLeft: `2px solid ${color}`, color: color }}
                                        >
                                            {titleProperty ? (row.properties[titleProperty.id] as string) || 'Untitled' : 'Untitled'}
                                        </button>
                                    );
                                })}
                                {dayRows.length > 3 && (
                                    <span className="text-[10px] text-slate-500 pl-1">+{dayRows.length - 3} more</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
