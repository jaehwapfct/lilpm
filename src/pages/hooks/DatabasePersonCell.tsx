import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
}

interface DatabasePersonCellProps {
    value: string | string[] | null;
    multiple?: boolean;
    teamMembers: TeamMember[];
    onUpdate: (value: unknown) => void;
}

export function DatabasePersonCell({ value, multiple = false, teamMembers, onUpdate }: DatabasePersonCellProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selectedIds = Array.isArray(value) ? value : value ? [value] : [];
    const selectedMembers = teamMembers.filter(m => selectedIds.includes(m.id));

    const filtered = useMemo(() => {
        if (!search) return teamMembers;
        const q = search.toLowerCase();
        return teamMembers.filter(m =>
            m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
        );
    }, [teamMembers, search]);

    const toggle = (memberId: string) => {
        if (multiple) {
            const next = selectedIds.includes(memberId)
                ? selectedIds.filter(id => id !== memberId)
                : [...selectedIds, memberId];
            onUpdate(next.length > 0 ? next : null);
        } else {
            onUpdate(selectedIds.includes(memberId) ? null : memberId);
            setOpen(false);
        }
    };

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="min-h-[32px] flex items-center gap-1 px-1 cursor-pointer rounded hover:bg-white/5 transition-colors flex-wrap">
                    {selectedMembers.length > 0 ? (
                        selectedMembers.map(member => (
                            <Badge key={member.id} variant="outline" className="text-xs gap-1 pl-0.5 group/person">
                                <Avatar className="h-4 w-4">
                                    <AvatarImage src={member.avatarUrl} />
                                    <AvatarFallback className="text-[8px]">{getInitials(member.name)}</AvatarFallback>
                                </Avatar>
                                {member.name}
                                <button
                                    className="opacity-0 group-hover/person:opacity-100"
                                    onClick={(e) => { e.stopPropagation(); toggle(member.id); }}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))
                    ) : (
                        <span className="text-sm text-slate-500">
                            <User className="h-3.5 w-3.5 inline mr-1" /> Assign
                        </span>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="start">
                <div className="p-2 border-b border-white/10">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search members..."
                            className="h-8 pl-8 text-xs bg-transparent"
                            autoFocus
                        />
                    </div>
                </div>
                <ScrollArea className="max-h-[200px]">
                    <div className="p-1">
                        {filtered.map(member => {
                            const isSelected = selectedIds.includes(member.id);
                            return (
                                <button
                                    key={member.id}
                                    onClick={() => toggle(member.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left",
                                        "hover:bg-white/5",
                                        isSelected && "bg-white/10"
                                    )}
                                >
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={member.avatarUrl} />
                                        <AvatarFallback className="text-[9px]">{getInitials(member.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm truncate">{member.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{member.email}</div>
                                    </div>
                                    {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                                </button>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div className="text-center text-slate-500 text-xs py-3">No members found</div>
                        )}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
