import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Check, Plus, X, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DatabaseProperty } from './databaseTypes';

interface EditableCellProps {
    value: unknown;
    property: DatabaseProperty;
    onUpdate: (value: unknown) => void;
    onAddOption?: (optionName: string) => Promise<{ id: string; name: string; color: string } | undefined>;
}

export const EditableCell = React.memo(function EditableCell({ value, property, onUpdate, onAddOption }: EditableCellProps) {
    switch (property.type) {
        case 'text':
        case 'email':
        case 'phone':
            return <TextCell value={value as string} onUpdate={onUpdate} type={property.type} />;
        case 'number':
            return <NumberCell value={value as number} onUpdate={onUpdate} />;
        case 'url':
            return <UrlCell value={value as string} onUpdate={onUpdate} />;
        case 'formula':
            return <FormulaDisplay value={value} />;
        case 'relation':
            return <RelationDisplay value={value as string[]} />;
        case 'rollup':
            return <RollupDisplay value={value} />;
        case 'auto_id':
            return <AutoIdDisplay value={value as number} />;
        case 'button':
            return <ButtonPropertyDisplay />;
        case 'select':
        case 'status':
            return (
                <SelectCell
                    value={value as string}
                    options={property.options || []}
                    onUpdate={onUpdate}
                    onAddOption={onAddOption}
                />
            );
        case 'multi_select':
            return (
                <MultiSelectCell
                    value={(value as string[]) || []}
                    options={property.options || []}
                    onUpdate={onUpdate}
                    onAddOption={onAddOption}
                />
            );
        case 'date':
            return <DateCell value={value as string} onUpdate={onUpdate} />;
        case 'checkbox':
            return <CheckboxCell value={value as boolean} onUpdate={onUpdate} />;
        case 'created_time':
            return <ReadOnlyDate value={value as string} />;
        case 'last_edited_time':
            return <ReadOnlyDate value={value as string} />;
        case 'created_by':
        case 'last_edited_by':
            return <span className="text-sm text-slate-400">{(value as string) || '-'}</span>;
        default:
            return <span className="text-sm text-slate-400">{String(value || '')}</span>;
    }
});

// ── Text Cell ──────────────────────────────────────────────
function TextCell({ value, onUpdate, type }: { value: string; onUpdate: (v: unknown) => void; type: string }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setEditValue(value || '');
    }, [value]);

    const handleSave = useCallback(() => {
        setIsEditing(false);
        if (editValue !== (value || '')) {
            onUpdate(editValue || null);
        }
    }, [editValue, value, onUpdate]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setEditValue(value || '');
            setIsEditing(false);
        }
    }, [handleSave, value]);

    if (isEditing) {
        return (
            <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                type={type === 'email' ? 'email' : type === 'phone' ? 'tel' : 'text'}
                className="h-8 text-sm border-primary/50 bg-transparent focus-visible:ring-1"
            />
        );
    }

    return (
        <div
            className="min-h-[32px] flex items-center px-1 cursor-text rounded hover:bg-white/5 transition-colors"
            onClick={() => setIsEditing(true)}
        >
            <span className="text-sm truncate">{value || <span className="text-slate-500">Empty</span>}</span>
        </div>
    );
}

// ── Number Cell ────────────────────────────────────────────
function NumberCell({ value, onUpdate }: { value: number; onUpdate: (v: unknown) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value?.toString() || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setEditValue(value?.toString() || '');
    }, [value]);

    const handleSave = useCallback(() => {
        setIsEditing(false);
        const numVal = editValue === '' ? null : Number(editValue);
        if (numVal !== value) {
            onUpdate(numVal);
        }
    }, [editValue, value, onUpdate]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        else if (e.key === 'Escape') {
            setEditValue(value?.toString() || '');
            setIsEditing(false);
        }
    }, [handleSave, value]);

    if (isEditing) {
        return (
            <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                type="number"
                className="h-8 text-sm border-primary/50 bg-transparent focus-visible:ring-1"
            />
        );
    }

    return (
        <div
            className="min-h-[32px] flex items-center px-1 cursor-text rounded hover:bg-white/5 transition-colors"
            onClick={() => setIsEditing(true)}
        >
            <span className="text-sm">{value != null ? value : <span className="text-slate-500">Empty</span>}</span>
        </div>
    );
}

// ── URL Cell ───────────────────────────────────────────────
function UrlCell({ value, onUpdate }: { value: string; onUpdate: (v: unknown) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value || '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);

    useEffect(() => {
        setEditValue(value || '');
    }, [value]);

    const handleSave = useCallback(() => {
        setIsEditing(false);
        if (editValue !== (value || '')) {
            onUpdate(editValue || null);
        }
    }, [editValue, value, onUpdate]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        else if (e.key === 'Escape') {
            setEditValue(value || '');
            setIsEditing(false);
        }
    }, [handleSave, value]);

    if (isEditing) {
        return (
            <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                type="url"
                placeholder="https://..."
                className="h-8 text-sm border-primary/50 bg-transparent focus-visible:ring-1"
            />
        );
    }

    return (
        <div
            className="min-h-[32px] flex items-center px-1 cursor-text rounded hover:bg-white/5 transition-colors group"
            onClick={() => setIsEditing(true)}
        >
            {value ? (
                <div className="flex items-center gap-1.5 min-w-0">
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {value}
                    </a>
                    <ExternalLink className="h-3 w-3 text-slate-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            ) : (
                <span className="text-sm text-slate-500">Empty</span>
            )}
        </div>
    );
}

// ── Select Cell ────────────────────────────────────────────
function SelectCell({
    value,
    options,
    onUpdate,
    onAddOption,
}: {
    value: string;
    options: { id: string; name: string; color: string }[];
    onUpdate: (v: unknown) => void;
    onAddOption?: (name: string) => Promise<{ id: string; name: string; color: string } | undefined>;
}) {
    const [open, setOpen] = useState(false);
    const [newOptionName, setNewOptionName] = useState('');
    const selectedOption = options.find(o => o.id === value);

    const handleSelect = (optionId: string) => {
        onUpdate(optionId === value ? null : optionId);
        setOpen(false);
    };

    const handleAddNew = async () => {
        if (!newOptionName.trim() || !onAddOption) return;
        const newOption = await onAddOption(newOptionName.trim());
        if (newOption) {
            onUpdate(newOption.id);
            setNewOptionName('');
            setOpen(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="min-h-[32px] flex items-center px-1 cursor-pointer rounded hover:bg-white/5 transition-colors">
                    {selectedOption ? (
                        <Badge
                            style={{ backgroundColor: selectedOption.color + '20', color: selectedOption.color, borderColor: selectedOption.color }}
                            variant="outline"
                            className="text-xs"
                        >
                            {selectedOption.name}
                        </Badge>
                    ) : (
                        <span className="text-sm text-slate-500">Empty</span>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1 max-h-48 overflow-y-auto">
                    {options.map(option => (
                        <button
                            key={option.id}
                            onClick={() => handleSelect(option.id)}
                            className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/10",
                                option.id === value && "bg-white/10"
                            )}
                        >
                            <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: option.color }}
                            />
                            <span className="truncate">{option.name}</span>
                            {option.id === value && <Check className="h-3.5 w-3.5 ml-auto text-primary flex-shrink-0" />}
                        </button>
                    ))}
                </div>
                {onAddOption && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="flex gap-1">
                            <Input
                                value={newOptionName}
                                onChange={(e) => setNewOptionName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
                                placeholder="New option..."
                                className="h-7 text-xs bg-transparent"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 flex-shrink-0"
                                onClick={handleAddNew}
                                disabled={!newOptionName.trim()}
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

// ── Multi-Select Cell ──────────────────────────────────────
function MultiSelectCell({
    value,
    options,
    onUpdate,
    onAddOption,
}: {
    value: string[];
    options: { id: string; name: string; color: string }[];
    onUpdate: (v: unknown) => void;
    onAddOption?: (name: string) => Promise<{ id: string; name: string; color: string } | undefined>;
}) {
    const [open, setOpen] = useState(false);
    const [newOptionName, setNewOptionName] = useState('');
    const selectedIds = value || [];
    const selectedOptions = options.filter(o => selectedIds.includes(o.id));

    const handleToggle = (optionId: string) => {
        const newValue = selectedIds.includes(optionId)
            ? selectedIds.filter(id => id !== optionId)
            : [...selectedIds, optionId];
        onUpdate(newValue.length > 0 ? newValue : null);
    };

    const handleAddNew = async () => {
        if (!newOptionName.trim() || !onAddOption) return;
        const newOption = await onAddOption(newOptionName.trim());
        if (newOption) {
            onUpdate([...selectedIds, newOption.id]);
            setNewOptionName('');
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="min-h-[32px] flex items-center gap-1 px-1 cursor-pointer rounded hover:bg-white/5 transition-colors flex-wrap">
                    {selectedOptions.length > 0 ? (
                        selectedOptions.map(option => (
                            <Badge
                                key={option.id}
                                style={{ backgroundColor: option.color + '20', color: option.color, borderColor: option.color }}
                                variant="outline"
                                className="text-xs"
                            >
                                {option.name}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-sm text-slate-500">Empty</span>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1 max-h-48 overflow-y-auto">
                    {options.map(option => {
                        const isSelected = selectedIds.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                onClick={() => handleToggle(option.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/10",
                                    isSelected && "bg-white/10"
                                )}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                                    isSelected ? "bg-primary border-primary" : "border-white/20"
                                )}>
                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: option.color }}
                                />
                                <span className="truncate">{option.name}</span>
                            </button>
                        );
                    })}
                </div>
                {onAddOption && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="flex gap-1">
                            <Input
                                value={newOptionName}
                                onChange={(e) => setNewOptionName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
                                placeholder="New option..."
                                className="h-7 text-xs bg-transparent"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 flex-shrink-0"
                                onClick={handleAddNew}
                                disabled={!newOptionName.trim()}
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

// ── Date Cell ──────────────────────────────────────────────
function DateCell({ value, onUpdate }: { value: string; onUpdate: (v: unknown) => void }) {
    const [open, setOpen] = useState(false);
    const dateValue = value ? new Date(value) : undefined;

    const handleSelect = (date: Date | undefined) => {
        onUpdate(date ? date.toISOString() : null);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="min-h-[32px] flex items-center px-1 cursor-pointer rounded hover:bg-white/5 transition-colors group/date">
                    {dateValue ? (
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm">{format(dateValue, 'MMM d, yyyy')}</span>
                            <button
                                className="opacity-0 group-hover/date:opacity-100 hover:text-destructive transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdate(null);
                                }}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <span className="text-sm text-slate-500">Empty</span>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={dateValue}
                    onSelect={handleSelect}
                    initialFocus
                />
                {dateValue && (
                    <div className="px-3 pb-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-destructive hover:text-destructive"
                            onClick={() => {
                                onUpdate(null);
                                setOpen(false);
                            }}
                        >
                            Clear date
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

// ── Checkbox Cell ──────────────────────────────────────────
function CheckboxCell({ value, onUpdate }: { value: boolean; onUpdate: (v: unknown) => void }) {
    return (
        <div
            className="min-h-[32px] flex items-center px-1 cursor-pointer"
            onClick={() => onUpdate(!value)}
        >
            <div className={cn(
                "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                value
                    ? "bg-primary border-primary"
                    : "border-white/20 hover:border-white/40"
            )}>
                {value && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
        </div>
    );
}

// ── Read-Only Date ─────────────────────────────────────────
function ReadOnlyDate({ value }: { value: string }) {
    if (!value) return <span className="text-sm text-slate-500">-</span>;
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return <span className="text-sm text-slate-500">Invalid date</span>;
        return <span className="text-sm text-slate-400">{format(d, 'MMM d, yyyy HH:mm')}</span>;
    } catch {
        return <span className="text-sm text-slate-500">Invalid date</span>;
    }
}

// ── Formula Display (read-only computed value) ─────────────
function FormulaDisplay({ value }: { value: unknown }) {
    if (value === null || value === undefined) return <span className="text-sm text-slate-500">-</span>;
    const str = String(value);
    const isError = str.startsWith('#ERROR');
    return (
        <div className="min-h-[32px] flex items-center px-1">
            <span className={cn("text-sm", isError ? "text-red-400 text-xs" : "text-slate-300")}>
                {str}
            </span>
        </div>
    );
}

// ── Relation Display (read-only badges) ────────────────────
function RelationDisplay({ value }: { value: string[] }) {
    const ids = value || [];
    if (ids.length === 0) return <span className="text-sm text-slate-500 px-1">-</span>;
    return (
        <div className="min-h-[32px] flex items-center gap-1 px-1 flex-wrap">
            {ids.map((id, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                    {id.slice(0, 8)}...
                </Badge>
            ))}
        </div>
    );
}

// ── Rollup Display (read-only computed) ────────────────────
function RollupDisplay({ value }: { value: unknown }) {
    if (value === null || value === undefined) return <span className="text-sm text-slate-500 px-1">-</span>;
    return (
        <div className="min-h-[32px] flex items-center px-1">
            <span className="text-sm text-slate-300">{String(value)}</span>
        </div>
    );
}

// ── Auto ID Display (read-only auto-increment) ────────────
function AutoIdDisplay({ value }: { value: number }) {
    return (
        <div className="min-h-[32px] flex items-center px-1">
            <span className="text-sm text-slate-400 font-mono">{value ?? '-'}</span>
        </div>
    );
}

// ── Button Property Display ────────────────────────────────
function ButtonPropertyDisplay() {
    return (
        <div className="min-h-[32px] flex items-center px-1">
            <button className="px-3 py-1 rounded-md text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors">
                Run
            </button>
        </div>
    );
}
