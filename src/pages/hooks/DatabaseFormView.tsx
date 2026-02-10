import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Check, CalendarIcon, Send, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PROPERTY_ICONS } from './databaseTypes';
import { Type } from 'lucide-react';
import type { DatabaseProperty } from './databaseTypes';

interface DatabaseFormViewProps {
    databaseName: string;
    properties: DatabaseProperty[];
    onSubmit: (data: Record<string, unknown>) => void;
}

export function DatabaseFormView({ databaseName, properties, onSubmit }: DatabaseFormViewProps) {
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [submitted, setSubmitted] = useState(false);

    // Only show editable properties (exclude auto-generated, formula, rollup)
    const formFields = properties.filter(p =>
        !['formula', 'rollup', 'created_time', 'created_by', 'last_edited_time', 'last_edited_by', 'auto_id', 'button'].includes(p.type)
    );

    const updateField = (propertyId: string, value: unknown) => {
        setFormData(prev => ({ ...prev, [propertyId]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        setSubmitted(true);
    };

    const handleReset = () => {
        setFormData({});
        setSubmitted(false);
    };

    if (submitted) {
        return (
            <div className="max-w-lg mx-auto mt-8">
                <Card>
                    <CardContent className="flex flex-col items-center py-12">
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                            <Check className="h-8 w-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Response submitted!</h3>
                        <p className="text-sm text-slate-400 mb-6">Your response has been recorded in {databaseName}.</p>
                        <Button variant="outline" onClick={handleReset}>
                            <RotateCcw className="h-4 w-4 mr-2" /> Submit another response
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto mt-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{databaseName}</CardTitle>
                    <p className="text-sm text-slate-400">Fill out the form below to add a new entry.</p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {formFields.map(prop => {
                            const IconComp = PROPERTY_ICONS[prop.type] || Type;
                            return (
                                <div key={prop.id}>
                                    <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                                        <IconComp className="h-4 w-4 text-slate-400" />
                                        {prop.name}
                                    </label>
                                    <FormField
                                        property={prop}
                                        value={formData[prop.id]}
                                        onChange={(val) => updateField(prop.id, val)}
                                    />
                                </div>
                            );
                        })}
                        <Button type="submit" className="w-full">
                            <Send className="h-4 w-4 mr-2" /> Submit
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

// ── Form Field Renderer ────────────────────────────────────
function FormField({ property, value, onChange }: {
    property: DatabaseProperty;
    value: unknown;
    onChange: (val: unknown) => void;
}) {
    switch (property.type) {
        case 'text':
        case 'email':
        case 'phone':
        case 'url':
            return (
                <Input
                    value={(value as string) || ''}
                    onChange={(e) => onChange(e.target.value || null)}
                    type={property.type === 'email' ? 'email' : property.type === 'url' ? 'url' : 'text'}
                    placeholder={`Enter ${property.name.toLowerCase()}...`}
                />
            );
        case 'number':
            return (
                <Input
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
                    type="number"
                    placeholder="0"
                />
            );
        case 'select':
        case 'status':
            return (
                <div className="flex flex-wrap gap-2">
                    {property.options?.map(option => (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => onChange(value === option.id ? null : option.id)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-sm transition-all border",
                                value === option.id
                                    ? "border-primary bg-primary/10"
                                    : "border-white/10 hover:border-white/20"
                            )}
                            style={value === option.id ? { borderColor: option.color, backgroundColor: option.color + '15', color: option.color } : {}}
                        >
                            {option.name}
                        </button>
                    ))}
                </div>
            );
        case 'multi_select':
            const selected = (value as string[]) || [];
            return (
                <div className="flex flex-wrap gap-2">
                    {property.options?.map(option => {
                        const isSelected = selected.includes(option.id);
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                    const next = isSelected
                                        ? selected.filter(id => id !== option.id)
                                        : [...selected, option.id];
                                    onChange(next.length > 0 ? next : null);
                                }}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-sm transition-all border",
                                    isSelected ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20"
                                )}
                                style={isSelected ? { borderColor: option.color, backgroundColor: option.color + '15', color: option.color } : {}}
                            >
                                {isSelected && <Check className="h-3 w-3 inline mr-1" />}
                                {option.name}
                            </button>
                        );
                    })}
                </div>
            );
        case 'date': {
            const [open, setOpen] = useState(false);
            const dateVal = value ? new Date(value as string) : undefined;
            return (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {dateVal ? format(dateVal, 'MMM d, yyyy') : 'Pick a date...'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={dateVal}
                            onSelect={(d) => { onChange(d ? d.toISOString() : null); setOpen(false); }}
                        />
                    </PopoverContent>
                </Popover>
            );
        }
        case 'checkbox':
            return (
                <div className="flex items-center gap-2">
                    <Switch checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked)} />
                    <span className="text-sm text-slate-400">{value ? 'Yes' : 'No'}</span>
                </div>
            );
        case 'person':
            return <Input value={(value as string) || ''} onChange={(e) => onChange(e.target.value || null)} placeholder="Enter name..." />;
        default:
            return <Input value={String(value || '')} onChange={(e) => onChange(e.target.value || null)} />;
    }
}
