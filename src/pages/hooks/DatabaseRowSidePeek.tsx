import React from 'react';
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Copy, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { EditableCell } from './EditableCell';
import { PROPERTY_ICONS } from './databaseTypes';
import type { DatabaseRow, DatabaseProperty } from './databaseTypes';
import { Type } from 'lucide-react';

interface DatabaseRowSidePeekProps {
    row: DatabaseRow | null;
    properties: DatabaseProperty[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdateCell: (rowId: string, propertyId: string, value: unknown) => void;
    onAddSelectOption: (propertyId: string, name: string) => Promise<{ id: string; name: string; color: string } | undefined>;
    onDeleteRow: (rowId: string) => void;
    onDuplicateRow: (rowId: string) => void;
}

export function DatabaseRowSidePeek({
    row,
    properties,
    open,
    onOpenChange,
    onUpdateCell,
    onAddSelectOption,
    onDeleteRow,
    onDuplicateRow,
}: DatabaseRowSidePeekProps) {
    if (!row) return null;

    // Find title property (first text property or first property)
    const titleProp = properties.find(p => p.name.toLowerCase() === 'title' || p.name.toLowerCase() === 'name')
        || properties.find(p => p.type === 'text')
        || properties[0];

    const titleValue = titleProp ? (row.properties[titleProp.id] as string) : 'Untitled';

    // Other properties (excluding title)
    const otherProperties = properties.filter(p => p.id !== titleProp?.id);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-[480px] w-full p-0 flex flex-col">
                {/* Header */}
                <SheetHeader className="p-6 pb-0">
                    <div className="flex items-start justify-between pr-8">
                        <div className="flex-1 min-w-0">
                            <SheetTitle className="text-xl font-bold">
                                {titleValue || 'Untitled'}
                            </SheetTitle>
                            <SheetDescription className="mt-1">
                                Created {format(new Date(row.createdAt), 'MMM d, yyyy')}
                            </SheetDescription>
                        </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-slate-400"
                            onClick={() => onDuplicateRow(row.id)}
                        >
                            <Copy className="h-3.5 w-3.5 mr-1.5" /> Duplicate
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => {
                                onDeleteRow(row.id);
                                onOpenChange(false);
                            }}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                        </Button>
                    </div>
                </SheetHeader>

                <Separator className="my-3 bg-white/10" />

                {/* Properties */}
                <ScrollArea className="flex-1 px-6">
                    <div className="space-y-1 pb-6">
                        {/* Title property (editable inline) */}
                        {titleProp && (
                            <PropertyRow
                                property={titleProp}
                                value={row.properties[titleProp.id]}
                                onUpdate={(value) => onUpdateCell(row.id, titleProp.id, value)}
                                onAddOption={(name) => onAddSelectOption(titleProp.id, name)}
                                isTitle
                            />
                        )}

                        {/* Other properties */}
                        {otherProperties.map(prop => (
                            <PropertyRow
                                key={prop.id}
                                property={prop}
                                value={row.properties[prop.id]}
                                onUpdate={(value) => onUpdateCell(row.id, prop.id, value)}
                                onAddOption={(name) => onAddSelectOption(prop.id, name)}
                            />
                        ))}
                    </div>

                    <Separator className="bg-white/10" />

                    {/* Page content area (placeholder for now) */}
                    <div className="py-6">
                        <div className="text-sm text-slate-500 italic">
                            Click here to add notes or content...
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}

// ── Property Row ───────────────────────────────────────────
function PropertyRow({
    property,
    value,
    onUpdate,
    onAddOption,
    isTitle = false,
}: {
    property: DatabaseProperty;
    value: unknown;
    onUpdate: (value: unknown) => void;
    onAddOption: (name: string) => Promise<{ id: string; name: string; color: string } | undefined>;
    isTitle?: boolean;
}) {
    const IconComponent = PROPERTY_ICONS[property.type] || Type;
    const isSelectType = property.type === 'select' || property.type === 'multi_select' || property.type === 'status';

    return (
        <div className={cn(
            "flex items-start gap-3 py-2 rounded-lg hover:bg-white/[0.02] transition-colors",
            isTitle && "pb-3"
        )}>
            {/* Property label */}
            <div className="flex items-center gap-2 min-w-[140px] pt-1.5 flex-shrink-0">
                <IconComponent className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-400 truncate">{property.name}</span>
            </div>

            {/* Property value */}
            <div className="flex-1 min-w-0">
                <EditableCell
                    value={value}
                    property={property}
                    onUpdate={onUpdate}
                    onAddOption={isSelectType ? onAddOption : undefined}
                />
            </div>
        </div>
    );
}
