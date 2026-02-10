import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Plus, TableIcon, Kanban, Calendar, List,
    LayoutGrid, MoreHorizontal, Edit, Trash2, Copy, Check,
    GanttChart, BarChart3, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DatabaseView } from './databaseTypes';

const VIEW_ICONS: Record<string, React.ElementType> = {
    table: TableIcon,
    board: Kanban,
    calendar: Calendar,
    list: List,
    gallery: LayoutGrid,
    timeline: GanttChart,
    chart: BarChart3,
    form: FileText,
};

const VIEW_LABELS: Record<string, string> = {
    table: 'Table',
    board: 'Board',
    calendar: 'Calendar',
    list: 'List',
    gallery: 'Gallery',
    timeline: 'Timeline',
    chart: 'Chart',
    form: 'Form',
};

interface DatabaseViewManagerProps {
    views: DatabaseView[];
    activeViewId: string | null;
    onViewChange: (viewId: string) => void;
    onCreateView: (name: string, type: DatabaseView['type']) => void;
    onDeleteView: (viewId: string) => void;
    onRenameView: (viewId: string, name: string) => void;
}

export function DatabaseViewManager({
    views,
    activeViewId,
    onViewChange,
    onCreateView,
    onDeleteView,
    onRenameView,
}: DatabaseViewManagerProps) {
    const [showNewView, setShowNewView] = useState(false);
    const [newViewName, setNewViewName] = useState('');
    const [newViewType, setNewViewType] = useState<DatabaseView['type']>('table');
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    const handleCreateView = () => {
        if (!newViewName.trim()) return;
        onCreateView(newViewName.trim(), newViewType);
        setNewViewName('');
        setShowNewView(false);
    };

    const startRename = (view: DatabaseView) => {
        setRenamingId(view.id);
        setRenameValue(view.name);
    };

    const finishRename = () => {
        if (renamingId && renameValue.trim()) {
            onRenameView(renamingId, renameValue.trim());
        }
        setRenamingId(null);
    };

    const viewTypes: DatabaseView['type'][] = ['table', 'board', 'list', 'calendar', 'gallery', 'timeline', 'chart', 'form'];

    return (
        <div className="flex items-center gap-1">
            {/* View tabs */}
            <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-0.5">
                {views.map(view => {
                    const Icon = VIEW_ICONS[view.type] || TableIcon;
                    const isActive = view.id === activeViewId;

                    return (
                        <div key={view.id} className="relative group flex items-center">
                            {renamingId === view.id ? (
                                <div className="flex items-center gap-1 px-1">
                                    <Input
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') finishRename();
                                            if (e.key === 'Escape') setRenamingId(null);
                                        }}
                                        onBlur={finishRename}
                                        className="h-7 w-24 text-xs bg-transparent"
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <button
                                    onClick={() => onViewChange(view.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                        isActive
                                            ? "bg-white/10 text-white"
                                            : "text-slate-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {view.name}
                                </button>
                            )}

                            {/* Context menu for view */}
                            {views.length > 1 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="absolute -right-1 top-0 h-full px-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="h-3 w-3 text-slate-400" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => startRename(view)}>
                                            <Edit className="h-4 w-4 mr-2" /> Rename
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            onCreateView(view.name + ' (copy)', view.type);
                                        }}>
                                            <Copy className="h-4 w-4 mr-2" /> Duplicate
                                        </DropdownMenuItem>
                                        {views.length > 1 && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => onDeleteView(view.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Add new view */}
            <Popover open={showNewView} onOpenChange={setShowNewView}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Plus className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-3" align="start">
                    <div className="space-y-3">
                        <Input
                            value={newViewName}
                            onChange={(e) => setNewViewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateView()}
                            placeholder="View name..."
                            className="h-8 text-sm bg-transparent"
                            autoFocus
                        />

                        {/* View type selector */}
                        <div className="grid grid-cols-5 gap-1">
                            {viewTypes.map(type => {
                                const Icon = VIEW_ICONS[type] || TableIcon;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setNewViewType(type)}
                                        className={cn(
                                            "flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors",
                                            newViewType === type
                                                ? "bg-primary/20 text-primary border border-primary/30"
                                                : "hover:bg-white/5 text-slate-400"
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="text-[10px]">{VIEW_LABELS[type]}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <Button
                            onClick={handleCreateView}
                            disabled={!newViewName.trim()}
                            className="w-full h-8 text-xs"
                        >
                            Create view
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
