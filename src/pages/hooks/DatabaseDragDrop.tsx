import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
    DragOverlay,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Sortable Row Wrapper ───────────────────────────────────
interface SortableRowProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

export function SortableRow({ id, children, className, style: extraStyle }: SortableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        ...extraStyle,
    };

    return (
        <tr ref={setNodeRef} style={style} className={cn(className, isDragging && 'bg-white/10')} {...attributes}>
            <td className="w-[30px] p-0">
                <button
                    {...listeners}
                    className="flex items-center justify-center w-full h-full p-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300"
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </button>
            </td>
            {children}
        </tr>
    );
}

// ── Sortable Column Header ─────────────────────────────────
interface SortableColumnProps {
    id: string;
    children: React.ReactNode;
    className?: string;
}

export function SortableColumn({ id, children, className }: SortableColumnProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <th
            ref={setNodeRef}
            style={style}
            className={cn(className, isDragging && 'bg-white/10', 'cursor-grab active:cursor-grabbing')}
            {...attributes}
            {...listeners}
        >
            {children}
        </th>
    );
}

// ── DnD Context Wrapper ────────────────────────────────────
interface DragDropContextProps {
    items: string[];
    onReorder: (oldIndex: number, newIndex: number) => void;
    strategy?: 'vertical' | 'horizontal';
    children: React.ReactNode;
}

export function DragDropContext({ items, onReorder, strategy = 'vertical', children }: DragDropContextProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = items.indexOf(String(active.id));
        const newIndex = items.indexOf(String(over.id));

        if (oldIndex !== -1 && newIndex !== -1) {
            onReorder(oldIndex, newIndex);
        }
    };

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
                items={items}
                strategy={strategy === 'vertical' ? verticalListSortingStrategy : horizontalListSortingStrategy}
            >
                {children}
            </SortableContext>
        </DndContext>
    );
}

// ── Board DnD (card between columns) ──────────────────────
interface BoardDragDropProps {
    children: React.ReactNode;
    onCardMove: (rowId: string, fromColumnId: string, toColumnId: string) => void;
}

export function BoardDragDrop({ children, onCardMove }: BoardDragDropProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
    );

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter}>
            {children}
        </DndContext>
    );
}

// ── Utility: arrayMove re-export ───────────────────────────
export { arrayMove };

// ── Resizable Column Hook ──────────────────────────────────
export function useColumnResize(initialWidths: Record<string, number>) {
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths);
    const [resizing, setResizing] = useState<string | null>(null);

    const startResize = (columnId: string, startX: number) => {
        setResizing(columnId);
        const startWidth = columnWidths[columnId] || 150;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - startX;
            const newWidth = Math.max(80, startWidth + delta);
            setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
        };

        const handleMouseUp = () => {
            setResizing(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    return { columnWidths, setColumnWidths, resizing, startResize };
}

// ── Resize Handle Component ────────────────────────────────
interface ResizeHandleProps {
    columnId: string;
    onResizeStart: (columnId: string, startX: number) => void;
}

export function ResizeHandle({ columnId, onResizeStart }: ResizeHandleProps) {
    return (
        <div
            className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-primary/50 transition-colors group"
            onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onResizeStart(columnId, e.clientX);
            }}
        >
            <div className="absolute right-0 top-1/4 h-1/2 w-0.5 bg-white/10 group-hover:bg-primary/50 rounded" />
        </div>
    );
}
