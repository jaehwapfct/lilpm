// Drag state management for Gantt Chart
import { useState, useCallback, useRef } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { Issue } from '@/types';
import type { DragState, Dependency, GroupedIssues } from '../types';

interface UseGanttDragProps {
    issues: Issue[];
    groupedIssues: GroupedIssues[];
    cellWidth: number;
    onIssueUpdate?: (id: string, updates: Partial<Issue>) => void;
    onIssueClick?: (issue: Issue) => void;
    onDependencyCreate?: (from: string, to: string) => void;
}

export interface UseGanttDragReturn {
    // Drag state
    dragState: DragState;
    dragDelta: number;
    dragDeltaY: number;
    snappedDelta: number;
    rowDragIssueId: string | null;
    rowDropTargetIndex: number | null;
    rowDropPosition: 'above' | 'below' | null;

    // Linking state
    linkingFrom: string | null;
    linkingFromPos: { x: number; y: number } | null;
    linkingFromSide: 'left' | 'right';
    mousePosition: { x: number; y: number };
    hoverTarget: { issueId: string; side: 'left' | 'right' } | null;
    dependencies: Dependency[];

    // Refs
    wasDraggedRef: React.RefObject<boolean>;
    deletedDepKeysRef: React.RefObject<Set<string>>;

    // Handlers
    handleBarMouseDown: (e: React.MouseEvent, issue: Issue, mode: 'move' | 'resize-start' | 'resize-end') => void;
    handleMouseMove: (e: MouseEvent) => void;
    handleMouseUp: () => void;
    handleRowMouseDown: (e: React.MouseEvent, issue: Issue) => void;
    handleStartLinking: (e: React.MouseEvent, issueId: string, side: 'left' | 'right') => void;
    handleLinkPointEnter: (issueId: string, side: 'left' | 'right') => void;
    handleLinkPointLeave: () => void;
    handleBarMouseEnter: (issueId: string) => void;

    // Setters
    setDependencies: React.Dispatch<React.SetStateAction<Dependency[]>>;
}

export function useGanttDrag({
    issues,
    groupedIssues,
    cellWidth,
    onIssueUpdate,
    onIssueClick,
    onDependencyCreate,
}: UseGanttDragProps): UseGanttDragReturn {
    const navigate = useNavigate();
    const wasDraggedRef = useRef(false);
    const deletedDepKeysRef = useRef<Set<string>>(new Set());

    // Drag state
    const [dragState, setDragState] = useState<DragState>({
        issueId: null,
        mode: null,
        startX: 0,
        startY: 0,
        originalDueDate: null,
        originalCreatedAt: null,
    });
    const [dragDelta, setDragDelta] = useState(0);
    const [dragDeltaY, setDragDeltaY] = useState(0);
    const [snappedDelta, setSnappedDelta] = useState(0);

    // Row reordering state
    const [rowDragIssueId, setRowDragIssueId] = useState<string | null>(null);
    const [rowDropTargetIndex, setRowDropTargetIndex] = useState<number | null>(null);
    const [rowDropPosition, setRowDropPosition] = useState<'above' | 'below' | null>(null);

    // Linking state
    const [linkingFrom, setLinkingFrom] = useState<string | null>(null);
    const [linkingFromPos, setLinkingFromPos] = useState<{ x: number; y: number } | null>(null);
    const [linkingFromSide, setLinkingFromSide] = useState<'left' | 'right'>('right');
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [hoverTarget, setHoverTarget] = useState<{ issueId: string; side: 'left' | 'right' } | null>(null);
    const [dependencies, setDependencies] = useState<Dependency[]>([]);

    const handleBarMouseDown = useCallback((e: React.MouseEvent, issue: Issue, mode: 'move' | 'resize-start' | 'resize-end') => {
        e.preventDefault();
        e.stopPropagation();

        const issueStartDate = (issue as any).startDate || (issue as any).start_date;

        setDragState({
            issueId: issue.id,
            mode: mode === 'move' ? 'pending-bar' : mode,
            startX: e.clientX,
            startY: e.clientY,
            originalDueDate: issue.dueDate || null,
            originalCreatedAt: issueStartDate || issue.createdAt,
        });
        setDragDelta(0);
        setDragDeltaY(0);
        setSnappedDelta(0);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (linkingFrom) {
            setMousePosition({ x: e.clientX, y: e.clientY });
            return;
        }

        if (dragState.mode === 'pending-bar') {
            const dx = Math.abs(e.clientX - dragState.startX);
            const dy = Math.abs(e.clientY - dragState.startY);

            if (dx > 5 || dy > 5) {
                if (dy > dx) {
                    setDragState(prev => ({ ...prev, mode: 'row-reorder' }));
                } else {
                    setDragState(prev => ({ ...prev, mode: 'move' }));
                }
            }
            return;
        }

        if (dragState.mode === 'pending-row') {
            const dy = Math.abs(e.clientY - dragState.startY);
            if (dy > 5) {
                setDragState(prev => ({ ...prev, mode: 'row-reorder' }));
            }
            return;
        }

        if (!dragState.issueId || !dragState.mode) return;

        if (dragState.mode === 'row-reorder') {
            const deltaY = e.clientY - dragState.startY;
            setDragDeltaY(deltaY);

            const element = document.elementFromPoint(e.clientX, e.clientY);
            const row = element?.closest('[data-issue-index]');

            if (row) {
                const index = parseInt(row.getAttribute('data-issue-index') || '0', 10);
                const rect = row.getBoundingClientRect();
                const isAbove = e.clientY < (rect.top + rect.height / 2);

                setRowDropTargetIndex(index);
                setRowDropPosition(isAbove ? 'above' : 'below');
            }
            return;
        }

        const deltaX = e.clientX - dragState.startX;
        setDragDelta(deltaX);

        const snappedDays = Math.round(deltaX / cellWidth);
        setSnappedDelta(snappedDays * cellWidth);
    }, [dragState, linkingFrom, cellWidth]);

    const handleMouseUp = useCallback(() => {
        if (linkingFrom && hoverTarget) {
            setDependencies(prev => [...prev, { from: linkingFrom, to: hoverTarget.issueId }]);
            onDependencyCreate?.(linkingFrom, hoverTarget.issueId);
        }

        if (linkingFrom) {
            setLinkingFrom(null);
            setLinkingFromPos(null);
            setLinkingFromSide('right');
            setHoverTarget(null);
        }

        if (dragState.issueId && dragState.mode) {
            // Handle pending-row mode (click without significant drag = navigate)
            if (dragState.mode === 'pending-row') {
                const issue = issues.find(i => i.id === dragState.issueId);
                if (issue) {
                    resetDragState();
                    if (onIssueClick) {
                        onIssueClick(issue);
                    } else {
                        navigate(`/issue/${issue.id}`);
                    }
                    return;
                }
            }

            if (dragState.mode === 'row-reorder' && rowDropTargetIndex !== null) {
                handleRowReorder();
            } else if (snappedDelta !== 0) {
                handleDateChange();
            }
        }

        resetDragState();
    }, [linkingFrom, hoverTarget, dragState, snappedDelta, rowDropTargetIndex, issues, navigate, onIssueClick, onDependencyCreate]);

    const handleRowReorder = useCallback(() => {
        const allIssues = groupedIssues.flatMap(g => g.issues);
        const draggedIssueIndex = allIssues.findIndex(i => i.id === dragState.issueId);

        if (draggedIssueIndex === rowDropTargetIndex) return;
        if (rowDropTargetIndex === null || rowDropTargetIndex < 0 || rowDropTargetIndex >= allIssues.length) return;
        if (draggedIssueIndex === -1) return;

        const issueId = dragState.issueId!;
        const BASE_GAP = 1000000;

        const issuesWithoutDragged = allIssues.filter(i => i.id !== issueId);

        let insertIndex: number;
        if (rowDropPosition === 'above') {
            insertIndex = draggedIssueIndex < rowDropTargetIndex
                ? rowDropTargetIndex - 1
                : rowDropTargetIndex;
        } else {
            insertIndex = draggedIssueIndex < rowDropTargetIndex
                ? rowDropTargetIndex
                : rowDropTargetIndex + 1;
        }

        insertIndex = Math.max(0, Math.min(insertIndex, issuesWithoutDragged.length));

        const itemBefore = insertIndex > 0 ? issuesWithoutDragged[insertIndex - 1] : null;
        const itemAfter = insertIndex < issuesWithoutDragged.length ? issuesWithoutDragged[insertIndex] : null;

        let newSortOrder: number;

        if (!itemBefore && !itemAfter) {
            newSortOrder = BASE_GAP;
        } else if (!itemBefore) {
            const afterOrder = itemAfter!.sortOrder ?? BASE_GAP;
            newSortOrder = Math.max(1, Math.floor(afterOrder / 2));
        } else if (!itemAfter) {
            const beforeOrder = itemBefore.sortOrder ?? (insertIndex * BASE_GAP);
            newSortOrder = beforeOrder + BASE_GAP;
        } else {
            const beforeOrder = itemBefore.sortOrder ?? (insertIndex * BASE_GAP);
            const afterOrder = itemAfter.sortOrder ?? ((insertIndex + 1) * BASE_GAP);

            if (afterOrder <= beforeOrder) {
                newSortOrder = beforeOrder + Math.floor(BASE_GAP / 2);
            } else {
                newSortOrder = Math.floor((beforeOrder + afterOrder) / 2);
            }
        }

        if (newSortOrder < 1) {
            newSortOrder = Date.now();
        }

        wasDraggedRef.current = true;
        onIssueUpdate?.(issueId, { sortOrder: newSortOrder });
    }, [groupedIssues, dragState, rowDropTargetIndex, rowDropPosition, onIssueUpdate]);

    const handleDateChange = useCallback(() => {
        const daysDelta = Math.round(snappedDelta / cellWidth);
        if (daysDelta === 0) return;

        const issue = issues.find(i => i.id === dragState.issueId);
        if (!issue) return;

        const issueStartDateStr = (issue as any).startDate || (issue as any).start_date;
        const originalStartDate = issueStartDateStr
            ? parseISO(issueStartDateStr)
            : parseISO(issue.createdAt);
        const originalDueDate = dragState.originalDueDate
            ? parseISO(dragState.originalDueDate)
            : addDays(originalStartDate, 3);

        if (dragState.mode === 'move') {
            const newStartDate = addDays(originalStartDate, daysDelta);
            const newDueDate = addDays(originalDueDate, daysDelta);
            onIssueUpdate?.(issue.id, {
                startDate: format(newStartDate, 'yyyy-MM-dd'),
                dueDate: format(newDueDate, 'yyyy-MM-dd')
            });
        } else if (dragState.mode === 'resize-end') {
            const newDueDate = addDays(originalDueDate, daysDelta);
            if (newDueDate >= originalStartDate) {
                onIssueUpdate?.(issue.id, { dueDate: format(newDueDate, 'yyyy-MM-dd') });
            }
        } else if (dragState.mode === 'resize-start') {
            const newStartDate = addDays(originalStartDate, daysDelta);
            if (newStartDate <= originalDueDate) {
                onIssueUpdate?.(issue.id, { startDate: format(newStartDate, 'yyyy-MM-dd') });
            }
        }
    }, [snappedDelta, cellWidth, issues, dragState, onIssueUpdate]);

    const resetDragState = useCallback(() => {
        setDragDelta(0);
        setSnappedDelta(0);
        setDragDeltaY(0);
        setDragState({
            issueId: null,
            mode: null,
            startX: 0,
            startY: 0,
            originalDueDate: null,
            originalCreatedAt: null,
        });
        setRowDropTargetIndex(null);
        setRowDropPosition(null);
        setRowDragIssueId(null);
    }, []);

    const handleRowMouseDown = useCallback((e: React.MouseEvent, issue: Issue) => {
        e.preventDefault();
        if ((e.target as HTMLElement).closest('button, [role="button"], .cursor-pointer, [role="menuitem"]')) return;

        setDragState({
            issueId: issue.id,
            mode: 'pending-row',
            startX: e.clientX,
            startY: e.clientY,
            originalDueDate: issue.dueDate || null,
            originalCreatedAt: (issue as any).startDate || (issue as any).start_date || issue.createdAt,
        });
        setDragDeltaY(0);
        setRowDragIssueId(issue.id);
    }, []);

    const handleStartLinking = useCallback((e: React.MouseEvent, issueId: string, side: 'left' | 'right') => {
        e.preventDefault();
        e.stopPropagation();
        setLinkingFrom(issueId);
        setLinkingFromSide(side);

        const barElement = (e.currentTarget as HTMLElement).closest('[data-bar-id]') as HTMLElement;
        if (barElement) {
            const rect = barElement.getBoundingClientRect();
            setLinkingFromPos({
                x: side === 'right' ? rect.right : rect.left,
                y: rect.top + rect.height / 2
            });
        } else {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            setLinkingFromPos({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            });
        }
        setMousePosition({ x: e.clientX, y: e.clientY });
    }, []);

    const handleLinkPointEnter = useCallback((issueId: string, side: 'left' | 'right') => {
        if (linkingFrom && linkingFrom !== issueId) {
            setHoverTarget({ issueId, side });
        }
    }, [linkingFrom]);

    const handleLinkPointLeave = useCallback(() => {
        setHoverTarget(null);
    }, []);

    const handleBarMouseEnter = useCallback((_issueId: string) => {
        // No-op - must hover on link point to create dependency
    }, []);

    return {
        dragState,
        dragDelta,
        dragDeltaY,
        snappedDelta,
        rowDragIssueId,
        rowDropTargetIndex,
        rowDropPosition,
        linkingFrom,
        linkingFromPos,
        linkingFromSide,
        mousePosition,
        hoverTarget,
        dependencies,
        wasDraggedRef,
        deletedDepKeysRef,
        handleBarMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleRowMouseDown,
        handleStartLinking,
        handleLinkPointEnter,
        handleLinkPointLeave,
        handleBarMouseEnter,
        setDependencies,
    };
}
