// Navigation and zoom logic for Gantt Chart
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    startOfWeek,
    endOfWeek,
    isToday,
} from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { ViewMode, DateRange } from '../types';
import { getCellWidth } from '../utils/ganttUtils';

export interface UseGanttNavigationReturn {
    currentDate: Date;
    viewMode: ViewMode;
    cellWidth: number;
    dateRange: DateRange;
    dateLocale: typeof ko | typeof enUS;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    sidebarRef: React.RefObject<HTMLDivElement>;

    setViewMode: (mode: ViewMode) => void;
    handlePrevious: () => void;
    handleNext: () => void;
    handleToday: () => void;
}

export function useGanttNavigation(): UseGanttNavigationReturn {
    const { i18n } = useTranslation();
    const dateLocale = i18n.language === 'ko' ? ko : enUS;

    // Refs for scroll sync
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isSyncingLeft = useRef(false);
    const isSyncingRight = useRef(false);
    const hasInitialScrolled = useRef(false);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');

    const cellWidth = useMemo(() => getCellWidth(viewMode), [viewMode]);

    // Calculate date range based on view mode
    const dateRange = useMemo((): DateRange => {
        let start: Date, end: Date;

        switch (viewMode) {
            case 'day':
                start = startOfWeek(currentDate, { locale: dateLocale });
                end = endOfWeek(addWeeks(currentDate, 1), { locale: dateLocale });
                break;
            case 'week':
                start = startOfWeek(subWeeks(currentDate, 1), { locale: dateLocale });
                end = endOfWeek(addWeeks(currentDate, 5), { locale: dateLocale });
                break;
            case 'month':
                start = startOfMonth(subMonths(currentDate, 1));
                end = endOfMonth(addMonths(currentDate, 2));
                break;
            case 'quarter':
                start = startOfMonth(subMonths(currentDate, 2));
                end = endOfMonth(addMonths(currentDate, 4));
                break;
            default:
                start = startOfMonth(currentDate);
                end = endOfMonth(currentDate);
        }

        return {
            start,
            end,
            days: eachDayOfInterval({ start, end })
        };
    }, [currentDate, viewMode, dateLocale]);

    // Scroll sync effect
    useEffect(() => {
        const right = scrollContainerRef.current;
        const left = sidebarRef.current;
        if (!right || !left) return;

        const handleLeftScroll = () => {
            if (!isSyncingLeft.current) {
                isSyncingRight.current = true;
                right.scrollTop = left.scrollTop;
            }
            isSyncingLeft.current = false;
        };

        const handleRightScroll = () => {
            if (!isSyncingRight.current) {
                isSyncingLeft.current = true;
                left.scrollTop = right.scrollTop;
            }
            isSyncingRight.current = false;
        };

        left.addEventListener('scroll', handleLeftScroll);
        right.addEventListener('scroll', handleRightScroll);

        return () => {
            left.removeEventListener('scroll', handleLeftScroll);
            right.removeEventListener('scroll', handleRightScroll);
        };
    }, []);

    // Initial focus on today
    useEffect(() => {
        if (hasInitialScrolled.current) return;

        const timer = setTimeout(() => {
            if (scrollContainerRef.current && !hasInitialScrolled.current) {
                const todayIndex = dateRange.days.findIndex(d => isToday(d));
                if (todayIndex > -1) {
                    scrollContainerRef.current.scrollLeft = Math.max(0, todayIndex * cellWidth - 200);
                    hasInitialScrolled.current = true;
                }
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [dateRange.days, cellWidth]);

    const handlePrevious = useCallback(() => {
        switch (viewMode) {
            case 'day':
                setCurrentDate(prev => subWeeks(prev, 1));
                break;
            case 'week':
                setCurrentDate(prev => subWeeks(prev, 2));
                break;
            case 'month':
            case 'quarter':
                setCurrentDate(prev => subMonths(prev, 1));
                break;
        }
    }, [viewMode]);

    const handleNext = useCallback(() => {
        switch (viewMode) {
            case 'day':
                setCurrentDate(prev => addWeeks(prev, 1));
                break;
            case 'week':
                setCurrentDate(prev => addWeeks(prev, 2));
                break;
            case 'month':
            case 'quarter':
                setCurrentDate(prev => addMonths(prev, 1));
                break;
        }
    }, [viewMode]);

    const handleToday = useCallback(() => {
        setCurrentDate(new Date());
        setTimeout(() => {
            if (scrollContainerRef.current) {
                const todayIndex = dateRange.days.findIndex(d => isToday(d));
                if (todayIndex > -1) {
                    scrollContainerRef.current.scrollLeft = Math.max(0, todayIndex * cellWidth - 200);
                }
            }
        }, 100);
    }, [dateRange, cellWidth]);

    return {
        currentDate,
        viewMode,
        cellWidth,
        dateRange,
        dateLocale,
        scrollContainerRef,
        sidebarRef,
        setViewMode,
        handlePrevious,
        handleNext,
        handleToday,
    };
}
