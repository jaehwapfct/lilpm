import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  differenceInDays,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
  parseISO,
  isValid,
  addDays,
  subDays,
} from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, Layers, User, Folder, GripVertical, Link2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { StatusIcon, PriorityIcon } from './IssueIcons';
import { IssueTypeIcon } from './IssueTypeIcon';
import type { Issue } from '@/types';

interface GanttCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'upcoming' | 'active' | 'completed';
}

interface GanttChartProps {
  issues: Issue[];
  cycles?: GanttCycle[];
  onIssueClick?: (issue: Issue) => void;
  onIssueUpdate?: (issueId: string, updates: { dueDate?: string; startDate?: string; sortOrder?: number }) => void;
  onDependencyCreate?: (fromIssueId: string, toIssueId: string) => void;
  onCycleCreate?: (startDate: string, endDate: string, name: string) => void;
}

interface DragState {
  issueId: string | null;
  mode: 'move' | 'resize-start' | 'resize-end' | 'link' | null;
  startX: number;
  originalDueDate: string | null;
  originalCreatedAt: string | null;
}

interface Dependency {
  from: string;
  to: string;
}

type ViewMode = 'day' | 'week' | 'month' | 'quarter';
type GroupBy = 'none' | 'project' | 'assignee' | 'status';

interface GroupedIssues {
  key: string;
  label: string;
  issues: Issue[];
  isCollapsed: boolean;
}

export function GanttChart({ issues, cycles = [], onIssueClick, onIssueUpdate, onDependencyCreate, onCycleCreate }: GanttChartProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dateLocale = i18n.language === 'ko' ? ko : enUS;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Drag state
  const [dragState, setDragState] = useState<DragState>({
    issueId: null,
    mode: null,
    startX: 0,
    originalDueDate: null,
    originalCreatedAt: null,
  });
  const [dragDelta, setDragDelta] = useState(0); // Visual offset during drag (in pixels)
  const [snappedDelta, setSnappedDelta] = useState(0); // Snapped to cell boundaries
  const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
  const [linkingFromPos, setLinkingFromPos] = useState<{ x: number; y: number } | null>(null);
  const [linkingFromSide, setLinkingFromSide] = useState<'left' | 'right'>('right');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [hoverTarget, setHoverTarget] = useState<{ issueId: string; side: 'left' | 'right' } | null>(null); // For snapping dependency lines

  // Sync dependencies from issues (DB persistence)
  useEffect(() => {
    const loadedDependencies: Dependency[] = [];
    issues.forEach(issue => {
      if (issue.blocking) {
        issue.blocking.forEach(dep => {
          // Avoid duplicates if both sides are present
          if (!loadedDependencies.some(d => d.from === issue.id && d.to === dep.targetIssueId)) {
            loadedDependencies.push({ from: issue.id, to: dep.targetIssueId });
          }
        });
      }
    });
    setDependencies(loadedDependencies);
  }, [issues]);

  // Row reordering state - enhanced for better snapping
  const [rowDragIssueId, setRowDragIssueId] = useState<string | null>(null);
  const [rowDropTargetIndex, setRowDropTargetIndex] = useState<number | null>(null);
  const [rowDropPosition, setRowDropPosition] = useState<'above' | 'below' | null>(null);
  const [rowDragFromIndex, setRowDragFromIndex] = useState<number | null>(null);

  // Ref to track scroll container position for accurate line positioning
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate the cell width based on view mode
  const cellWidth = useMemo(() => {
    switch (viewMode) {
      case 'day': return 60;
      case 'week': return 40;
      case 'month': return 32;
      case 'quarter': return 20;
      default: return 32;
    }
  }, [viewMode]);

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
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

  // Group issues based on groupBy setting
  const groupedIssues = useMemo((): GroupedIssues[] => {
    // Filter issues that have at least a due date
    const issuesWithDates = issues.filter(issue => issue.dueDate || issue.createdAt);

    // Sort by sortOrder first, then by due date
    const sortIssues = (issueList: Issue[]) => {
      return [...issueList].sort((a, b) => {
        // Primary sort: sortOrder (if defined)
        if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
          return a.sortOrder - b.sortOrder;
        }
        if (a.sortOrder !== undefined) return -1;
        if (b.sortOrder !== undefined) return 1;
        // Fallback: sort by due date
        const dateA = new Date(a.dueDate || a.createdAt);
        const dateB = new Date(b.dueDate || b.createdAt);
        return dateA.getTime() - dateB.getTime();
      });
    };

    if (groupBy === 'none') {
      return [{
        key: 'all',
        label: t('gantt.allIssues', 'All Issues'),
        issues: sortIssues(issuesWithDates),
        isCollapsed: false,
      }];
    }

    const groups = new Map<string, Issue[]>();

    issuesWithDates.forEach(issue => {
      let key: string;
      let label: string;

      switch (groupBy) {
        case 'project':
          key = issue.projectId || 'no-project';
          label = key === 'no-project' ? t('gantt.noProject', 'No Project') : `Project ${key.slice(0, 8)}`;
          break;
        case 'assignee':
          key = issue.assigneeId || 'unassigned';
          label = key === 'unassigned' ? t('gantt.unassigned', 'Unassigned') : `User ${key.slice(0, 8)}`;
          break;
        case 'status':
          key = issue.status;
          label = t(`status.${issue.status}`);
          break;
        default:
          key = 'all';
          label = 'All';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(issue);
    });

    return Array.from(groups.entries()).map(([key, groupIssues]) => ({
      key,
      label: groupBy === 'status' ? t(`status.${key}`) :
        groupBy === 'project' && key === 'no-project' ? t('gantt.noProject', 'No Project') :
          groupBy === 'assignee' && key === 'unassigned' ? t('gantt.unassigned', 'Unassigned') :
            key.slice(0, 12),
      issues: sortIssues(groupIssues),
      isCollapsed: collapsedGroups.has(key),
    }));
  }, [issues, groupBy, collapsedGroups, t]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handlePrevious = () => {
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
  };

  const handleNext = () => {
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
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    // Scroll to today
    setTimeout(() => {
      if (scrollContainerRef.current) {
        const todayIndex = dateRange.days.findIndex(d => isToday(d));
        if (todayIndex > -1) {
          scrollContainerRef.current.scrollLeft = Math.max(0, todayIndex * cellWidth - 200);
        }
      }
    }, 100);
  };

  // Drag handlers - enhanced for proper resize/move
  const handleBarMouseDown = useCallback((e: React.MouseEvent, issue: Issue, mode: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();

    // Get the start date for the issue
    const issueStartDate = (issue as any).startDate || (issue as any).start_date;

    setDragState({
      issueId: issue.id,
      mode,
      startX: e.clientX,
      originalDueDate: issue.dueDate || null,
      originalCreatedAt: issueStartDate || issue.createdAt,
    });
    setDragDelta(0);
    setSnappedDelta(0);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Handle linking line
    if (linkingFrom) {
      setMousePosition({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!dragState.issueId || !dragState.mode) return;

    const deltaX = e.clientX - dragState.startX;

    // Update raw drag delta for visual feedback
    setDragDelta(deltaX);

    // Calculate snapped delta (snaps to cell boundaries)
    const snappedDays = Math.round(deltaX / cellWidth);
    setSnappedDelta(snappedDays * cellWidth);
  }, [dragState, linkingFrom, cellWidth]);

  const handleMouseUp = useCallback(() => {
    // Handle linking completion
    if (linkingFrom && hoverTarget) {
      // Create dependency when dropping on a target
      setDependencies(prev => [...prev, { from: linkingFrom, to: hoverTarget.issueId }]);
      onDependencyCreate?.(linkingFrom, hoverTarget.issueId);
    }

    if (linkingFrom) {
      setLinkingFrom(null);
      setLinkingFromPos(null);
      setLinkingFromSide('right');
      setHoverTarget(null);
    }

    // Commit the drag changes using snapped delta
    if (dragState.issueId && dragState.mode && snappedDelta !== 0) {
      const daysDelta = Math.round(snappedDelta / cellWidth);

      if (daysDelta !== 0) {
        const issue = issues.find(i => i.id === dragState.issueId);
        if (issue) {
          const issueStartDateStr = (issue as any).startDate || (issue as any).start_date;
          const originalStartDate = issueStartDateStr
            ? parseISO(issueStartDateStr)
            : parseISO(issue.createdAt);
          const originalDueDate = dragState.originalDueDate
            ? parseISO(dragState.originalDueDate)
            : addDays(originalStartDate, 3);

          if (dragState.mode === 'move') {
            // Move both start and end dates
            const newStartDate = addDays(originalStartDate, daysDelta);
            const newDueDate = addDays(originalDueDate, daysDelta);
            onIssueUpdate?.(issue.id, {
              startDate: format(newStartDate, 'yyyy-MM-dd'),
              dueDate: format(newDueDate, 'yyyy-MM-dd')
            });
          } else if (dragState.mode === 'resize-end') {
            // Only change the end date
            const newDueDate = addDays(originalDueDate, daysDelta);
            // Ensure due date is not before start date
            if (newDueDate >= originalStartDate) {
              onIssueUpdate?.(issue.id, { dueDate: format(newDueDate, 'yyyy-MM-dd') });
            }
          } else if (dragState.mode === 'resize-start') {
            // Only change the start date
            const newStartDate = addDays(originalStartDate, daysDelta);
            // Ensure start date is not after due date
            if (newStartDate <= originalDueDate) {
              onIssueUpdate?.(issue.id, { startDate: format(newStartDate, 'yyyy-MM-dd') });
            }
          }
        }
      }
    }

    setDragDelta(0);
    setSnappedDelta(0);
    setDragState({
      issueId: null,
      mode: null,
      startX: 0,
      originalDueDate: null,
      originalCreatedAt: null,
    });
  }, [linkingFrom, hoverTarget, dragState, snappedDelta, cellWidth, issues, onIssueUpdate, onDependencyCreate]);

  const handleStartLinking = useCallback((e: React.MouseEvent, issueId: string, side: 'left' | 'right') => {
    e.preventDefault();
    e.stopPropagation();
    setLinkingFrom(issueId);
    setLinkingFromSide(side);

    // Get the actual bar element's position for accurate starting point
    const barElement = (e.currentTarget as HTMLElement).closest('[data-bar-id]') as HTMLElement;
    if (barElement) {
      const rect = barElement.getBoundingClientRect();
      // Start from the side of the bar (left or right edge center)
      setLinkingFromPos({
        x: side === 'right' ? rect.right : rect.left,
        y: rect.top + rect.height / 2
      });
    } else {
      // Fallback to link dot position
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setLinkingFromPos({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  // Handle hovering over a connection point while linking
  const handleLinkPointEnter = useCallback((issueId: string, side: 'left' | 'right') => {
    if (linkingFrom && linkingFrom !== issueId) {
      setHoverTarget({ issueId, side });
    }
  }, [linkingFrom]);

  const handleLinkPointLeave = useCallback(() => {
    setHoverTarget(null);
  }, []);

  const handleBarMouseEnter = useCallback((issueId: string) => {
    // No longer auto-create dependency on bar enter - must hover on link point
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (dragState.issueId || linkingFrom) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.issueId, linkingFrom, handleMouseMove, handleMouseUp]);

  const getBarPosition = useCallback((issue: Issue) => {
    const dueDate = issue.dueDate ? parseISO(issue.dueDate) : null;
    const createdDate = parseISO(issue.createdAt);

    // Use explicit start_date if available, otherwise fall back to created date
    const issueStartDate = (issue as any).startDate || (issue as any).start_date;
    const startDate = issueStartDate ? parseISO(issueStartDate) : createdDate;

    // Safety check for invalid dates
    const safeStartDate = isValid(startDate) ? startDate : new Date(); // Fallback to now if invalid

    // Use due date as end, or start date + 3 days if no due date
    const endDate = dueDate && isValid(dueDate) ? dueDate : addDays(safeStartDate, 3);

    const safeEndDate = isValid(endDate) ? endDate : addDays(safeStartDate, 3);

    const startIndex = differenceInDays(safeStartDate, dateRange.start);
    const endIndex = differenceInDays(safeEndDate, dateRange.start);
    const totalDays = dateRange.days.length;

    // Calculate position
    const left = Math.max(0, startIndex * cellWidth);
    const width = Math.max(cellWidth, (endIndex - startIndex + 1) * cellWidth);

    const isVisible = endIndex >= 0 && startIndex < totalDays;

    return {
      left: `${left}px`,
      width: `${Math.min(width, (totalDays - Math.max(0, startIndex)) * cellWidth)}px`,
      isVisible,
      hasDueDate: !!dueDate && isValid(dueDate),
      hasStartDate: !!issueStartDate,
    };
  }, [dateRange, cellWidth]);

  const getStatusColor = (status: Issue['status']) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-500 hover:bg-emerald-600';
      case 'in_progress':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'in_review':
        return 'bg-amber-500 hover:bg-amber-600';
      case 'todo':
        return 'bg-slate-500 hover:bg-slate-600';
      case 'cancelled':
        return 'bg-red-500/70 hover:bg-red-600/70';
      default:
        return 'bg-slate-400 hover:bg-slate-500';
    }
  };

  const handleIssueClick = (issue: Issue) => {
    if (onIssueClick) {
      onIssueClick(issue);
    } else {
      navigate(`/issue/${issue.id}`);
    }
  };

  const totalWidth = dateRange.days.length * cellWidth;

  // Get week/month markers for header
  const getHeaderMarkers = () => {
    const markers: { date: Date; label: string; span: number }[] = [];
    let currentMonth = '';
    let currentSpan = 0;
    let startIndex = 0;

    dateRange.days.forEach((day, index) => {
      const monthKey = format(day, 'yyyy-MM');
      if (monthKey !== currentMonth) {
        if (currentMonth) {
          markers.push({
            date: dateRange.days[startIndex],
            label: format(dateRange.days[startIndex], 'MMMM yyyy', { locale: dateLocale }),
            span: currentSpan,
          });
        }
        currentMonth = monthKey;
        currentSpan = 1;
        startIndex = index;
      } else {
        currentSpan++;
      }
    });

    // Push last month
    if (currentSpan > 0) {
      markers.push({
        date: dateRange.days[startIndex],
        label: format(dateRange.days[startIndex], 'MMMM yyyy', { locale: dateLocale }),
        span: currentSpan,
      });
    }

    return markers;
  };

  const totalIssuesWithDates = groupedIssues.reduce((sum, g) => sum + g.issues.length, 0);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={handleToday}>
            {t('gantt.today', 'Today')}
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-3 text-base font-semibold">
            {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Create Cycle Button */}
          {onCycleCreate && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2"
              onClick={() => {
                // Create a cycle for the current month view
                const startDate = format(dateRange.start, 'yyyy-MM-dd');
                const endDate = format(addDays(dateRange.start, 13), 'yyyy-MM-dd');
                const cycleName = t('gantt.newCycle', 'New Cycle');
                onCycleCreate(startDate, endDate, cycleName);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('gantt.createCycle', 'New Cycle')}
            </Button>
          )}

          {/* Group By */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-2">
                <Layers className="h-3.5 w-3.5" />
                {t('gantt.groupBy', 'Group')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setGroupBy('none')}>
                {groupBy === 'none' && '✓ '}{t('gantt.noGrouping', 'No Grouping')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('project')}>
                <Folder className="h-4 w-4 mr-2" />
                {groupBy === 'project' && '✓ '}{t('gantt.byProject', 'By Project')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('assignee')}>
                <User className="h-4 w-4 mr-2" />
                {groupBy === 'assignee' && '✓ '}{t('gantt.byAssignee', 'By Assignee')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('status')}>
                {groupBy === 'status' && '✓ '}{t('gantt.byStatus', 'By Status')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Zoom Level */}
          <div className="flex items-center border border-border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => {
                const modes: ViewMode[] = ['day', 'week', 'month', 'quarter'];
                const currentIndex = modes.indexOf(viewMode);
                if (currentIndex > 0) setViewMode(modes[currentIndex - 1]);
              }}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-xs font-medium min-w-[60px] text-center border-x border-border">
              {t(`gantt.${viewMode}`, viewMode)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => {
                const modes: ViewMode[] = ['day', 'week', 'month', 'quarter'];
                const currentIndex = modes.indexOf(viewMode);
                if (currentIndex < modes.length - 1) setViewMode(modes[currentIndex + 1]);
              }}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Fixed Issue Column */}
        <div className="w-72 flex-shrink-0 border-r border-border flex flex-col bg-background z-10">
          {/* Column Header */}
          <div className="h-16 border-b border-border px-3 flex items-end pb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {t('gantt.issues', 'Issues')} ({totalIssuesWithDates})
            </span>
          </div>

          {/* Issue List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {totalIssuesWithDates === 0 ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <div className="text-center px-4">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">{t('gantt.noIssues', 'No issues with dates')}</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {t('gantt.addDueDates', 'Add due dates to see issues here')}
                  </p>
                </div>
              </div>
            ) : (
              groupedIssues.map((group) => (
                <div key={group.key}>
                  {/* Group Header */}
                  {groupBy !== 'none' && (
                    <div
                      className="h-8 px-3 flex items-center gap-2 bg-muted/50 border-b border-border cursor-pointer hover:bg-muted/70"
                      onClick={() => toggleGroup(group.key)}
                    >
                      <ChevronRight className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        !group.isCollapsed && "rotate-90"
                      )} />
                      <span className="text-xs font-medium truncate">{group.label}</span>
                      <span className="text-xs text-muted-foreground">({group.issues.length})</span>
                    </div>
                  )}

                  {/* Group Issues - Draggable for reordering */}
                  {!group.isCollapsed && group.issues.map((issue, issueIndex) => {
                    const isSidebarDragging = rowDragIssueId === issue.id;
                    const isSidebarDropTarget = rowDropTargetIndex === issueIndex;

                    return (
                      <div
                        key={issue.id}
                        draggable
                        onDragStart={(e) => {
                          const globalIndex = group.issues.slice(0, issueIndex).reduce((acc, iss) => acc + 1, 0) +
                            groupedIssues.slice(0, groupedIssues.findIndex(g => g.key === group.key))
                              .reduce((acc, g) => acc + g.issues.length, 0);

                          e.dataTransfer.setData('text/plain', JSON.stringify({
                            issueId: issue.id,
                            groupKey: group.key,
                            originalIndex: issueIndex,
                            globalIndex
                          }));
                          e.dataTransfer.effectAllowed = 'move';
                          setRowDragIssueId(issue.id);
                          setRowDragFromIndex(globalIndex);
                        }}
                        onDragEnd={() => {
                          setRowDragIssueId(null);
                          setRowDropTargetIndex(null);
                          setRowDropPosition(null);
                          setRowDragFromIndex(null);
                        }}
                        onDragOver={(e) => {
                          if (!rowDragIssueId || rowDragIssueId === issue.id) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';

                          const rect = e.currentTarget.getBoundingClientRect();
                          const midY = rect.top + rect.height / 2;
                          const dragY = e.clientY;
                          const isAbove = dragY < midY;

                          // Calculate global index for target
                          const globalIndex = group.issues.slice(0, issueIndex).reduce((acc, iss) => acc + 1, 0) +
                            groupedIssues.slice(0, groupedIssues.findIndex(g => g.key === group.key))
                              .reduce((acc, g) => acc + g.issues.length, 0);

                          setRowDropTargetIndex(globalIndex);
                          setRowDropPosition(isAbove ? 'above' : 'below');
                        }}
                        onDragLeave={(e) => {
                          // Only clear if we're actually leaving the entire row area
                          const relatedTarget = e.relatedTarget as HTMLElement;
                          const currentTarget = e.currentTarget as HTMLElement;

                          // Check if the related target is still within the current row or a child
                          if (relatedTarget && (currentTarget.contains(relatedTarget) || relatedTarget === currentTarget)) {
                            return;
                          }

                          // Additional check: Only clear if mouse is outside bounds
                          const rect = currentTarget.getBoundingClientRect();
                          if (
                            e.clientX >= rect.left &&
                            e.clientX <= rect.right &&
                            e.clientY >= rect.top &&
                            e.clientY <= rect.bottom
                          ) {
                            return;
                          }

                          setRowDropTargetIndex(null);
                          setRowDropPosition(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!rowDragIssueId || rowDragIssueId === issue.id || !onIssueUpdate) return;

                          const rect = e.currentTarget.getBoundingClientRect();
                          const midY = rect.top + rect.height / 2;
                          const isAbove = e.clientY < midY;

                          // Get the target issue's sort order
                          const targetSortOrder = issue.sortOrder !== undefined ? issue.sortOrder : issueIndex * 1000;

                          // Find all issues in the same group
                          const allIssues = groupedIssues.flatMap(g => g.issues);
                          const targetIdx = allIssues.findIndex(i => i.id === issue.id);

                          // Calculate new sort order based on position
                          let newSortOrder: number;
                          if (isAbove) {
                            // Insert above: use target's sort order - 500
                            const prevIssue = targetIdx > 0 ? allIssues[targetIdx - 1] : null;
                            if (prevIssue && prevIssue.sortOrder !== undefined) {
                              newSortOrder = (prevIssue.sortOrder + targetSortOrder) / 2;
                            } else {
                              newSortOrder = targetSortOrder - 500;
                            }
                          } else {
                            // Insert below: use target's sort order + 500
                            const nextIssue = targetIdx < allIssues.length - 1 ? allIssues[targetIdx + 1] : null;
                            if (nextIssue && nextIssue.sortOrder !== undefined) {
                              newSortOrder = (targetSortOrder + nextIssue.sortOrder) / 2;
                            } else {
                              newSortOrder = targetSortOrder + 500;
                            }
                          }

                          console.log(`Moving issue ${rowDragIssueId} ${isAbove ? 'above' : 'below'} ${issue.identifier} (new sortOrder: ${newSortOrder})`);
                          onIssueUpdate(rowDragIssueId, { sortOrder: newSortOrder });

                          setRowDragIssueId(null);
                          setRowDropTargetIndex(null);
                          setRowDropPosition(null);
                          setRowDragFromIndex(null);
                        }}
                        className={cn(
                          "h-10 px-3 flex items-center gap-2 border-b border-border/50 cursor-grab hover:bg-muted/30 active:cursor-grabbing select-none relative",
                          "transition-all duration-200 ease-out",
                          isSidebarDragging && "opacity-50 scale-[0.98] shadow-lg z-50",
                          isSidebarDropTarget && rowDropPosition === 'above' && "border-t-4 border-t-primary shadow-sm",
                          isSidebarDropTarget && rowDropPosition === 'below' && "border-b-4 border-b-primary shadow-sm",
                          // Add animated translate for neighbor rows
                          !isSidebarDragging && rowDropTargetIndex !== null && (() => {
                            const globalIndex = group.issues.slice(0, issueIndex).reduce((acc, iss) => acc + 1, 0) +
                              groupedIssues.slice(0, groupedIssues.findIndex(g => g.key === group.key))
                                .reduce((acc, g) => acc + g.issues.length, 0);

                            if (rowDragFromIndex !== null && rowDropTargetIndex !== null) {
                              if (rowDropPosition === 'above' && globalIndex >= rowDropTargetIndex && globalIndex < rowDragFromIndex) {
                                return 'translate-y-10';
                              }
                              if (rowDropPosition === 'below' && globalIndex <= rowDropTargetIndex && globalIndex > rowDragFromIndex) {
                                return '-translate-y-10';
                              }
                            }
                            return '';
                          })()
                        )}
                        onClick={() => handleIssueClick(issue)}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground flex-shrink-0 cursor-grab active:cursor-grabbing" />
                        <IssueTypeIcon type={(issue as any).type || 'task'} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" title={issue.title}>
                            {issue.title}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                          {issue.identifier}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Scrollable Timeline */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto"
        >
          <div style={{ width: `${totalWidth}px`, minWidth: '100%' }} className="relative">
            {/* Dependency Lines - SVG Overlay */}
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
              style={{ overflow: 'visible' }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#f59e0b" />
                </marker>
                <marker
                  id="arrowhead-hover"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#ef4444" />
                </marker>
                <marker
                  id="arrowhead-snap"
                  markerWidth="10"
                  markerHeight="8"
                  refX="9"
                  refY="4"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <polygon points="0 0, 10 4, 0 8" fill="#22c55e" />
                </marker>
              </defs>

              {dependencies.map((dep, index) => {
                const fromIssue = issues.find(i => i.id === dep.from);
                const toIssue = issues.find(i => i.id === dep.to);
                if (!fromIssue || !toIssue) return null;

                const fromPos = getBarPosition(fromIssue);
                const toPos = getBarPosition(toIssue);

                // Get row indices
                let fromRowIndex = 0;
                let toRowIndex = 0;
                let currentRow = 0;
                for (const group of groupedIssues) {
                  for (const issue of group.issues) {
                    if (issue.id === dep.from) fromRowIndex = currentRow;
                    if (issue.id === dep.to) toRowIndex = currentRow;
                    currentRow++;
                  }
                }

                // Calculate actual pixel positions relative to timeline
                const headerHeight = 64; // Approx height of headers including month/day rows
                const rowHeight = 40;

                // End of source bar
                const fromX = parseFloat(fromPos.left) + parseFloat(fromPos.width);
                const fromY = headerHeight + (fromRowIndex * rowHeight) + (rowHeight / 2);
                // Start of target bar
                const toX = parseFloat(toPos.left);
                const toY = headerHeight + (toRowIndex * rowHeight) + (rowHeight / 2);

                // Advanced Notion/Figma-style bezier curve calculation
                const horizontalDist = Math.abs(toX - fromX);
                const verticalDist = Math.abs(toY - fromY);
                const distance = Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);

                // Dynamic control point offset based on distance
                const baseOffset = Math.min(distance / 3, 80);
                const curveStrength = Math.min(verticalDist / 2, 60);

                let pathD: string;

                if (toX > fromX + 20) {
                  const cp1x = fromX + baseOffset;
                  const cp1y = fromY;
                  const cp2x = toX - baseOffset;
                  const cp2y = toY;
                  pathD = `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`;
                } else if (toX < fromX - 20) {
                  const loopOffset = Math.max(60, baseOffset);
                  const vertDirection = toY > fromY ? 1 : -1;
                  const midY = (fromY + toY) / 2;

                  pathD = `M ${fromX} ${fromY} 
                           C ${fromX + loopOffset} ${fromY}, 
                             ${fromX + loopOffset} ${fromY + (vertDirection * curveStrength)}, 
                             ${(fromX + toX) / 2 + loopOffset / 2} ${midY}
                           S ${toX - loopOffset} ${toY},
                             ${toX} ${toY}`;
                } else {
                  const cp1x = fromX + 40;
                  const cp2x = toX - 40;
                  pathD = `M ${fromX} ${fromY} C ${cp1x} ${fromY}, ${cp2x} ${toY}, ${toX} ${toY}`;
                }

                return (
                  <g key={`dep-${index}`} className="pointer-events-auto group/dep">
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="12"
                      className="cursor-pointer"
                      onClick={() => {
                        onDependencyCreate && onDependencyCreate(dep.from, dep.to); // Trigger delete potentially if we had onDependencyDelete
                        // For now just remove from local view
                        setDependencies(prev => prev.filter((_, i) => i !== index));
                      }}
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                      className="group-hover/dep:stroke-red-500 transition-colors"
                      style={{ pointerEvents: 'none' }}
                    />
                  </g>
                );
              })}

              {/* Linking line while dragging */}
              {linkingFrom && linkingFromPos && (
                (() => {
                  // We need to transform screen coordinates to timeline coordinates because SVG is now inside timeline
                  // The linkingFromPos is from getBoundingClientRect (screen coords)
                  // MousePosition is screen coords
                  // We need relative coords.

                  // Actually, better to use the bar's logical position if possible.
                  // linkingFromPos in original code was:
                  // x: rect.right, y: rect.top + height/2.

                  // Since we changed SVG to be inside timeline, we must calculate 'from' based on data, not screen rects,
                  // OR we must subtract the container's BoundingRect.

                  // Let's use data-based calculation consistent with the dependency lines above.
                  const fromIssue = issues.find(i => i.id === linkingFrom);
                  if (!fromIssue) return null;

                  // Find row index
                  let fromRowIndex = 0;
                  let currentRow = 0;
                  for (const group of groupedIssues) {
                    for (const issue of group.issues) {
                      if (issue.id === linkingFrom) fromRowIndex = currentRow;
                      currentRow++;
                    }
                  }

                  const fromPos = getBarPosition(fromIssue);
                  const headerHeight = 64;
                  const rowHeight = 40;

                  const fromX = linkingFromSide === 'right'
                    ? parseFloat(fromPos.left) + parseFloat(fromPos.width)
                    : parseFloat(fromPos.left);
                  const fromY = headerHeight + (fromRowIndex * rowHeight) + (rowHeight / 2);

                  // For 'toX', we need mouse position relative to timeline.
                  // This is tricky. simpler to use logic:
                  // if snapped to target, use target data position.
                  // else? 

                  let toX: number;
                  let toY: number;
                  let isSnapped = false;

                  if (hoverTarget) {
                    const targetIssue = issues.find(i => i.id === hoverTarget.issueId);
                    if (targetIssue) {
                      const targetPos = getBarPosition(targetIssue);
                      let targetRowIndex = 0;
                      let currentRow = 0;
                      for (const group of groupedIssues) {
                        for (const issue of group.issues) {
                          if (issue.id === hoverTarget.issueId) targetRowIndex = currentRow;
                          currentRow++;
                        }
                      }

                      toX = parseFloat(targetPos.left) + (hoverTarget.side === 'right' ? parseFloat(targetPos.width) : 0);
                      toY = headerHeight + (targetRowIndex * rowHeight) + (rowHeight / 2);
                      isSnapped = true;
                    } else {
                      toX = fromX + 100; toY = fromY; // Fallback
                    }
                  } else {
                    // Approximate mouse pos relative to timeline?
                    // Using the dragDelta helps if we were dragging a bar, but here we are moving mouse.
                    // We need the container ref to get its rect.
                    // scrollContainerRef.current
                    if (scrollContainerRef.current) {
                      const rect = scrollContainerRef.current.getBoundingClientRect();
                      toX = mousePosition.x - rect.left + scrollContainerRef.current.scrollLeft;
                      toY = mousePosition.y - rect.top + scrollContainerRef.current.scrollTop;
                      // Adjust for header if needed? Header is inside scroll container?
                      // The SVG is inside the inner div.
                      // The mouse is screen relative.
                      // inner div is relative to viewport? 
                      // Yes: mouseX - containerX + scrollLeft = x relative to content start.
                    } else {
                      toX = fromX + 100;
                      toY = fromY;
                    }
                  }

                  // ... Draw curve ...
                  const horizontalDist = Math.abs(toX - fromX);
                  const verticalDist = Math.abs(toY - fromY);
                  const distance = Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);

                  const cpOffset = Math.min(Math.max(distance / 3, 30), 100);

                  let pathD: string;
                  const startSide = linkingFromSide;
                  const direction = startSide === 'right' ? 1 : -1;

                  if ((toX - fromX) * direction > 20) {
                    const cp1x = fromX + (direction * cpOffset);
                    const cp1y = fromY;
                    const cp2x = toX - (direction * cpOffset);
                    const cp2y = toY;
                    pathD = `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`;
                  } else {
                    const loopOffset = Math.max(cpOffset, 60);
                    const midY = (fromY + toY) / 2;
                    pathD = `M ${fromX} ${fromY} 
                             C ${fromX + (direction * loopOffset)} ${fromY}, 
                               ${fromX + (direction * loopOffset)} ${midY}, 
                               ${(fromX + toX) / 2} ${midY}
                             S ${toX - (direction * loopOffset)} ${toY},
                               ${toX} ${toY}`;
                  }

                  return (
                    <g>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={isSnapped ? "#22c55e" : "#f59e0b"}
                        strokeWidth="2"
                        opacity="0.8"
                        strokeDasharray="8,4"
                        markerEnd={isSnapped ? "url(#arrowhead-snap)" : "url(#arrowhead)"}
                      />
                    </g>
                  );
                })()
              )}
            </svg>
            {/* Timeline Header */}
            <div className="sticky top-0 z-10 bg-background border-b border-border">
              {/* Month Row */}
              <div className="h-8 flex border-b border-border/50">
                {getHeaderMarkers().map((marker, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-center text-xs font-medium border-r border-border/30"
                    style={{ width: `${marker.span * cellWidth}px` }}
                  >
                    {marker.label}
                  </div>
                ))}
              </div>

              {/* Days Row */}
              <div className="h-8 flex">
                {dateRange.days.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col items-center justify-center border-r border-border/30",
                      isToday(day) && "bg-primary/10",
                      !isSameMonth(day, currentDate) && "text-muted-foreground/50"
                    )}
                    style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px` }}
                  >
                    <span className={cn(
                      "text-[10px] font-medium",
                      isToday(day) && "text-primary font-bold"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {viewMode !== 'quarter' && (
                      <span className="text-[9px] text-muted-foreground">
                        {format(day, 'EEE', { locale: dateLocale })}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Cycles Row - Jira-style sprint/cycle markers */}
              {cycles.length > 0 && (
                <div className="h-6 flex relative bg-muted/20 border-t border-border/30">
                  {dateRange.days.map((day, index) => (
                    <div
                      key={index}
                      className="border-r border-border/10"
                      style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px` }}
                    />
                  ))}
                  {/* Cycle Bars */}
                  {cycles.map((cycle) => {
                    const cycleStart = parseISO(cycle.startDate);
                    const cycleEnd = parseISO(cycle.endDate);

                    if (!isValid(cycleStart) || !isValid(cycleEnd)) return null;

                    const startDayIndex = dateRange.days.findIndex(d => isSameDay(d, cycleStart));
                    const endDayIndex = dateRange.days.findIndex(d => isSameDay(d, cycleEnd));

                    // Calculate visible portion
                    const visibleStart = Math.max(0, startDayIndex);
                    const visibleEnd = endDayIndex >= 0 ? endDayIndex : dateRange.days.length - 1;

                    if (visibleStart > dateRange.days.length - 1 || visibleEnd < 0) return null;

                    const left = visibleStart * cellWidth;
                    const width = (visibleEnd - visibleStart + 1) * cellWidth;

                    const statusColors = {
                      upcoming: 'bg-blue-500/30 border-blue-500/50 text-blue-400',
                      active: 'bg-green-500/30 border-green-500/50 text-green-400',
                      completed: 'bg-gray-500/30 border-gray-500/50 text-gray-400',
                    };

                    return (
                      <div
                        key={cycle.id}
                        className={cn(
                          "absolute top-1 bottom-1 rounded-full border flex items-center px-2 overflow-hidden",
                          statusColors[cycle.status]
                        )}
                        style={{ left: `${left}px`, width: `${width}px`, minWidth: '60px' }}
                        title={`${cycle.name}: ${format(cycleStart, 'PP', { locale: dateLocale })} - ${format(cycleEnd, 'PP', { locale: dateLocale })}`}
                      >
                        <span className="text-[10px] font-medium truncate">{cycle.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Timeline Rows */}
            <div>
              {groupedIssues.map((group) => (
                <div key={group.key}>
                  {/* Group Header Row */}
                  {groupBy !== 'none' && (
                    <div className="h-8 bg-muted/50 border-b border-border relative">
                      <div className="absolute inset-0 flex">
                        {dateRange.days.map((day, index) => (
                          <div
                            key={index}
                            className={cn(
                              "border-r border-border/20",
                              isToday(day) && "bg-primary/5"
                            )}
                            style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issue Rows */}
                  {!group.isCollapsed && group.issues.map((issue, issueIndex) => {
                    const barPos = getBarPosition(issue);
                    const isRowDragging = rowDragIssueId === issue.id;
                    const isDropTarget = rowDropTargetIndex === issueIndex;

                    // Calculate global index for this issue (across all groups)
                    let globalIndex = 0;
                    for (const g of groupedIssues) {
                      if (g.key === group.key) {
                        globalIndex += issueIndex;
                        break;
                      }
                      globalIndex += g.issues.length;
                    }

                    return (
                      <div
                        key={issue.id}
                        className={cn(
                          "h-10 relative border-b border-border/30 transition-all duration-200",
                          isRowDragging && "opacity-50",
                          isDropTarget && rowDropPosition === 'above' && "border-t-2 border-t-primary translate-x-2",
                          isDropTarget && rowDropPosition === 'below' && "border-b-2 border-b-primary translate-x-2"
                        )}
                        data-issue-id={issue.id}
                        data-issue-index={globalIndex}
                        data-group-key={group.key}
                        onDragOver={(e) => {
                          if (!rowDragIssueId || rowDragIssueId === issue.id) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';

                          const rect = e.currentTarget.getBoundingClientRect();
                          const midY = rect.top + rect.height / 2;
                          const isAbove = e.clientY < midY;

                          setRowDropTargetIndex(issueIndex);
                          setRowDropPosition(isAbove ? 'above' : 'below');
                        }}
                        onDragLeave={() => {
                          setRowDropTargetIndex(null);
                          setRowDropPosition(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!rowDragIssueId || rowDragIssueId === issue.id || !onIssueUpdate) return;

                          const rect = e.currentTarget.getBoundingClientRect();
                          const midY = rect.top + rect.height / 2;
                          const isAbove = e.clientY < midY;

                          // Calculate new sort order
                          const baseSortOrder = issue.sortOrder !== undefined ? issue.sortOrder : issueIndex * 1000;
                          const newSortOrder = isAbove ? baseSortOrder - 1 : baseSortOrder + 1;

                          console.log(`Moving issue ${rowDragIssueId} to ${isAbove ? 'above' : 'below'} ${issue.identifier} (sort: ${newSortOrder})`);
                          onIssueUpdate(rowDragIssueId, { sortOrder: newSortOrder });

                          setRowDragIssueId(null);
                          setRowDropTargetIndex(null);
                          setRowDropPosition(null);
                        }}
                      >
                        {/* Grid Background */}
                        <div className="absolute inset-0 flex">
                          {dateRange.days.map((day, index) => (
                            <div
                              key={index}
                              className={cn(
                                "border-r border-border/20",
                                isToday(day) && "bg-primary/5"
                              )}
                              style={{ width: `${cellWidth}px`, minWidth: `${cellWidth}px` }}
                            />
                          ))}
                        </div>

                        {/* Issue Bar */}
                        {barPos.isVisible && (() => {
                          const isDragging = dragState.issueId === issue.id;
                          const isLinkingFromThis = linkingFrom === issue.id;
                          const isLinkTarget = hoverTarget?.issueId === issue.id;

                          // Calculate snapped visual position during drag
                          const baseLeft = parseFloat(barPos.left);
                          const baseWidth = parseFloat(barPos.width);

                          // Snapped position (where it will land)
                          const snappedLeft = isDragging && (dragState.mode === 'move' || dragState.mode === 'resize-start')
                            ? baseLeft + snappedDelta : baseLeft;
                          const snappedWidth = isDragging && (dragState.mode === 'resize-end' || dragState.mode === 'resize-start')
                            ? (dragState.mode === 'resize-end'
                              ? Math.max(cellWidth, baseWidth + snappedDelta)
                              : Math.max(cellWidth, baseWidth - snappedDelta))
                            : baseWidth;

                          // Current visual position (follows mouse smoothly)
                          const visualLeft = isDragging && (dragState.mode === 'move' || dragState.mode === 'resize-start')
                            ? baseLeft + dragDelta : baseLeft;
                          const visualWidth = isDragging && (dragState.mode === 'resize-end' || dragState.mode === 'resize-start')
                            ? (dragState.mode === 'resize-end'
                              ? Math.max(cellWidth, baseWidth + dragDelta)
                              : Math.max(cellWidth, baseWidth - dragDelta))
                            : baseWidth;

                          return (
                            <>
                              {/* Ghost bar showing snapped position */}
                              {isDragging && (snappedDelta !== 0 || dragDelta !== 0) && (
                                <div
                                  className={cn(
                                    "absolute top-1/2 -translate-y-1/2 h-6 rounded border-2 border-dashed pointer-events-none z-25",
                                    getStatusColor(issue.status)
                                  )}
                                  style={{
                                    left: `${snappedLeft}px`,
                                    width: `${snappedWidth}px`,
                                    minWidth: '60px',
                                    opacity: 0.4,
                                  }}
                                />
                              )}

                              {/* Main bar - NO draggable, only date drag via mousedown */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    data-bar-id={issue.id}
                                    className={cn(
                                      "absolute top-1/2 -translate-y-1/2 h-6 rounded shadow-sm group/bar select-none",
                                      getStatusColor(issue.status),
                                      !barPos.hasDueDate && "border-2 border-dashed border-white/30",
                                      isDragging && "z-30 cursor-grabbing shadow-lg",
                                      !isDragging && "transition-all cursor-grab",
                                      isLinkingFromThis && "ring-2 ring-yellow-400 z-30",
                                      isLinkTarget && "ring-2 ring-green-400 z-30 scale-105",
                                      rowDragIssueId === issue.id && "opacity-50 scale-95"
                                    )}
                                    style={{
                                      left: `${visualLeft}px`,
                                      width: `${visualWidth}px`,
                                      minWidth: '60px',
                                      opacity: isDragging ? 0.7 : (rowDragIssueId === issue.id ? 0.5 : (barPos.hasDueDate ? 1 : 0.6)),
                                    }}
                                    onMouseDown={(e) => {
                                      // Only handle bar date drag on center area (not handles)
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      const relativeX = e.clientX - rect.left;
                                      const isOnLeftHandle = relativeX < 12; // Left 12px
                                      const isOnRightHandle = relativeX > rect.width - 12; // Right 12px

                                      if (!isOnLeftHandle && !isOnRightHandle) {
                                        handleBarMouseDown(e, issue, 'move');
                                      }
                                    }}
                                    onMouseEnter={() => handleBarMouseEnter(issue.id)}
                                    onDoubleClick={() => handleIssueClick(issue)}
                                  >
                                    {/* Left resize handle - wider hit area */}
                                    <div
                                      className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-white/20 hover:bg-white/40 rounded-l flex items-center justify-center z-20 transition-all"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleBarMouseDown(e, issue, 'resize-start');
                                      }}
                                      title="Drag to resize start date"
                                    >
                                      <div className="w-0.5 h-3 bg-white/80 rounded" />
                                    </div>

                                    {/* Bar content */}
                                    <div className="h-full flex items-center px-3 overflow-hidden pointer-events-none">
                                      <StatusIcon status={issue.status} className="h-3 w-3 mr-1.5 flex-shrink-0 text-white" />
                                      <span className="text-[10px] text-white font-medium truncate">
                                        {issue.identifier}
                                      </span>
                                    </div>

                                    {/* Right resize handle - wider hit area */}
                                    <div
                                      className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize opacity-0 group-hover/bar:opacity-100 bg-white/20 hover:bg-white/40 rounded-r flex items-center justify-center z-20 transition-all"
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleBarMouseDown(e, issue, 'resize-end');
                                      }}
                                      title="Drag to resize end date"
                                    >
                                      <div className="w-0.5 h-3 bg-white/80 rounded" />
                                    </div>

                                    {/* Link points - show when hovering or when actively linking */}
                                    <div
                                      data-link-point="left"
                                      data-issue-id={issue.id}
                                      className={cn(
                                        "absolute -left-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white/90 cursor-crosshair z-30 transition-all",
                                        linkingFrom
                                          ? (isLinkTarget && hoverTarget?.side === 'left'
                                            ? "opacity-100 bg-green-500 scale-[2] border-green-300 shadow-lg shadow-green-500/50"
                                            : "opacity-100 bg-amber-500")
                                          : "opacity-0 group-hover/bar:opacity-100 bg-amber-500 hover:scale-150 hover:bg-amber-400"
                                      )}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleStartLinking(e, issue.id, 'left');
                                      }}
                                      onMouseEnter={() => handleLinkPointEnter(issue.id, 'left')}
                                      onMouseLeave={handleLinkPointLeave}
                                    />
                                    <div
                                      data-link-point="right"
                                      data-issue-id={issue.id}
                                      className={cn(
                                        "absolute -right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white/90 cursor-crosshair z-30 transition-all",
                                        linkingFrom
                                          ? (isLinkTarget && hoverTarget?.side === 'right'
                                            ? "opacity-100 bg-green-500 scale-[2] border-green-300 shadow-lg shadow-green-500/50"
                                            : "opacity-100 bg-amber-500")
                                          : "opacity-0 group-hover/bar:opacity-100 bg-amber-500 hover:scale-150 hover:bg-amber-400"
                                      )}
                                      onMouseDown={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        handleStartLinking(e, issue.id, 'right');
                                      }}
                                      onMouseEnter={() => handleLinkPointEnter(issue.id, 'right')}
                                      onMouseLeave={handleLinkPointLeave}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1">
                                    <p className="font-medium text-sm">{issue.title}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{issue.identifier}</span>
                                      <span>•</span>
                                      <span>{t(`status.${issue.status}`)}</span>
                                    </div>
                                    {issue.dueDate && (
                                      <p className="text-xs">
                                        {t('issues.dueDate')}: {format(parseISO(issue.dueDate), 'PPP', { locale: dateLocale })}
                                      </p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      {t('gantt.dragToMove', 'Drag to move • Double-click to view')}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Today Line */}
            {dateRange.days.some(d => isToday(d)) && (
              <div
                className="absolute top-16 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{
                  left: `${(dateRange.days.findIndex(d => isToday(d)) * cellWidth) + cellWidth / 2}px`
                }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Footer Legend */}
      <div className="border-t border-border px-4 py-2 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="font-medium">{t('gantt.legend', 'Legend')}:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-slate-400" />
              <span>{t('status.backlog')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-slate-500" />
              <span>{t('status.todo')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>{t('status.in_progress')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span>{t('status.in_review')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>{t('status.done')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-8 h-3 rounded bg-slate-400/60 border-2 border-dashed border-white/30" />
            <span>{t('gantt.noDueDate', 'No due date')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
