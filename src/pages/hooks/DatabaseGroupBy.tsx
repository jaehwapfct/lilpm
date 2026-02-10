import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { GroupIcon, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DatabaseProperty } from './databaseTypes';
import { PROPERTY_ICONS } from './databaseTypes';
import { Type } from 'lucide-react';

interface DatabaseGroupByProps {
    properties: DatabaseProperty[];
    groupByPropertyId: string | null;
    onGroupByChange: (propertyId: string | null) => void;
}

export function DatabaseGroupBy({
    properties,
    groupByPropertyId,
    onGroupByChange,
}: DatabaseGroupByProps) {
    // Only allow grouping by select, status, checkbox, person
    const groupableProperties = properties.filter(
        p => ['select', 'status', 'multi_select', 'checkbox', 'person'].includes(p.type)
    );

    const activeProperty = properties.find(p => p.id === groupByPropertyId);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn(groupByPropertyId && "border-primary text-primary")}>
                    <GroupIcon className="h-4 w-4 mr-2" />
                    Group
                    {activeProperty && (
                        <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                            {activeProperty.name}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {groupByPropertyId && (
                    <>
                        <DropdownMenuItem onClick={() => onGroupByChange(null)}>
                            <X className="h-4 w-4 mr-2 text-slate-400" />
                            None (remove grouping)
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                {groupableProperties.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-400">
                        No groupable properties (add a select or status property)
                    </div>
                ) : (
                    groupableProperties.map(prop => {
                        const IconComponent = PROPERTY_ICONS[prop.type] || Type;
                        return (
                            <DropdownMenuItem
                                key={prop.id}
                                onClick={() => onGroupByChange(prop.id)}
                                className={cn(prop.id === groupByPropertyId && "bg-white/10")}
                            >
                                <IconComponent className="h-4 w-4 mr-2 text-slate-400" />
                                {prop.name}
                            </DropdownMenuItem>
                        );
                    })
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

// ── Grouped Rows Wrapper ───────────────────────────────────
// Utility component to render grouped content

interface GroupedRowsProps {
    rows: { id: string; properties: Record<string, unknown> }[];
    groupProperty: DatabaseProperty;
    renderGroup: (groupLabel: string, groupColor: string, groupRows: typeof rows) => React.ReactNode;
}

export function GroupedRows({ rows, groupProperty, renderGroup }: GroupedRowsProps) {
    if (groupProperty.type === 'checkbox') {
        const checked = rows.filter(r => Boolean(r.properties[groupProperty.id]));
        const unchecked = rows.filter(r => !r.properties[groupProperty.id]);
        return (
            <div className="space-y-6">
                {renderGroup('Checked', '#22c55e', checked)}
                {renderGroup('Unchecked', '#ef4444', unchecked)}
            </div>
        );
    }

    const options = groupProperty.options || [];
    const grouped = options.map(option => ({
        option,
        rows: rows.filter(r => {
            const val = r.properties[groupProperty.id];
            if (groupProperty.type === 'multi_select') {
                return Array.isArray(val) && (val as string[]).includes(option.id);
            }
            return val === option.id;
        }),
    }));

    // Ungrouped items
    const ungrouped = rows.filter(r => {
        const val = r.properties[groupProperty.id];
        if (!val) return true;
        if (groupProperty.type === 'multi_select') {
            return !Array.isArray(val) || (val as string[]).length === 0;
        }
        return !options.some(o => o.id === val);
    });

    return (
        <div className="space-y-6">
            {grouped.map(({ option, rows: groupRows }) => (
                <div key={option.id}>
                    {renderGroup(option.name, option.color, groupRows)}
                </div>
            ))}
            {ungrouped.length > 0 && renderGroup('No value', '#64748b', ungrouped)}
        </div>
    );
}
