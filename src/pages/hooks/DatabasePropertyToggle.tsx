import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DatabaseProperty } from './databaseTypes';
import { PROPERTY_ICONS } from './databaseTypes';
import { Type } from 'lucide-react';

interface DatabasePropertyToggleProps {
    properties: DatabaseProperty[];
    visibleProperties: string[];
    onVisibleChange: (visibleIds: string[]) => void;
}

export function DatabasePropertyToggle({
    properties,
    visibleProperties,
    onVisibleChange,
}: DatabasePropertyToggleProps) {
    const [open, setOpen] = React.useState(false);

    const allVisible = visibleProperties.length === properties.length;
    const someHidden = visibleProperties.length < properties.length && visibleProperties.length > 0;

    const toggleProperty = (propertyId: string) => {
        if (visibleProperties.includes(propertyId)) {
            // Don't allow hiding all properties
            if (visibleProperties.length <= 1) return;
            onVisibleChange(visibleProperties.filter(id => id !== propertyId));
        } else {
            onVisibleChange([...visibleProperties, propertyId]);
        }
    };

    const showAll = () => {
        onVisibleChange(properties.map(p => p.id));
    };

    const hideAll = () => {
        // Keep at least the first property visible
        if (properties.length > 0) {
            onVisibleChange([properties[0].id]);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(someHidden && "border-primary text-primary")}>
                    {someHidden ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    Properties
                    {someHidden && (
                        <span className="ml-1.5 text-xs text-slate-400">
                            {visibleProperties.length}/{properties.length}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="end">
                <div className="p-3 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Toggle properties</span>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400" onClick={showAll}>
                                Show all
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400" onClick={hideAll}>
                                Hide all
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-2 space-y-0.5 max-h-[350px] overflow-y-auto">
                    {properties.map((prop, index) => {
                        const isVisible = visibleProperties.includes(prop.id);
                        const IconComponent = PROPERTY_ICONS[prop.type] || Type;

                        return (
                            <button
                                key={prop.id}
                                className={cn(
                                    "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors",
                                    "hover:bg-white/5",
                                    !isVisible && "opacity-50"
                                )}
                                onClick={() => toggleProperty(prop.id)}
                            >
                                <IconComponent className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <span className="flex-1 text-left truncate">{prop.name}</span>
                                <Switch
                                    checked={isVisible}
                                    onCheckedChange={() => toggleProperty(prop.id)}
                                    className="scale-75"
                                />
                            </button>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
