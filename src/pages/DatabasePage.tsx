import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
    Plus, Search, Filter, MoreHorizontal, TableIcon, Kanban,
    Calendar, List, ChevronDown, Settings, Trash2, Copy, Edit,
    ArrowUpDown, Eye, EyeOff, Hash, Type, CalendarIcon,
    User, Link, CheckSquare, Percent, DollarSign, Clock,
    Mail, Phone, MapPin, Tag, FileText
} from 'lucide-react';
import { useTeamStore } from '@/stores/teamStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Database property types (Notion-style)
type PropertyType =
    | 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'person'
    | 'checkbox' | 'url' | 'email' | 'phone' | 'formula' | 'relation'
    | 'rollup' | 'created_time' | 'created_by' | 'last_edited_time'
    | 'last_edited_by' | 'files' | 'status';

interface DatabaseProperty {
    id: string;
    name: string;
    type: PropertyType;
    options?: { id: string; name: string; color: string }[];
    formula?: string;
    relationDatabaseId?: string;
    rollupProperty?: string;
}

interface DatabaseRow {
    id: string;
    properties: Record<string, unknown>;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
}

interface Database {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    properties: DatabaseProperty[];
    rows: DatabaseRow[];
    views: DatabaseView[];
    createdAt: string;
    teamId: string;
}

interface DatabaseView {
    id: string;
    name: string;
    type: 'table' | 'board' | 'calendar' | 'list' | 'gallery' | 'timeline';
    filters?: unknown[];
    sorts?: unknown[];
    groupBy?: string;
    visibleProperties?: string[];
}

const PROPERTY_ICONS: Record<PropertyType, React.ElementType> = {
    text: Type,
    number: Hash,
    select: Tag,
    multi_select: Tag,
    date: CalendarIcon,
    person: User,
    checkbox: CheckSquare,
    url: Link,
    email: Mail,
    phone: Phone,
    formula: Percent,
    relation: Link,
    rollup: ArrowUpDown,
    created_time: Clock,
    created_by: User,
    last_edited_time: Clock,
    last_edited_by: User,
    files: FileText,
    status: Tag,
};

const PROPERTY_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4',
];

export function DatabasePage() {
    const { t } = useTranslation();
    const { currentTeam } = useTeamStore();
    const [databases, setDatabases] = useState<Database[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
    const [currentView, setCurrentView] = useState<'table' | 'board' | 'calendar' | 'list'>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showNewDatabaseDialog, setShowNewDatabaseDialog] = useState(false);
    const [newDatabaseName, setNewDatabaseName] = useState('');

    // Load databases
    useEffect(() => {
        if (currentTeam) {
            loadDatabases();
        }
    }, [currentTeam]);

    const loadDatabases = async () => {
        if (!currentTeam) return;
        setIsLoading(true);

        try {
            // Load databases from Supabase
            const { data: dbData, error: dbError } = await supabase
                .from('databases')
                .select('*')
                .eq('team_id', currentTeam.id)
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;

            // If no databases exist, create a sample one
            if (!dbData || dbData.length === 0) {
                // Create sample database
                const { data: newDb, error: createError } = await supabase
                    .from('databases')
                    .insert({
                        team_id: currentTeam.id,
                        name: t('database.sampleTasks'),
                        description: t('database.sampleTasksDesc'),
                        icon: '📋',
                    })
                    .select()
                    .single();

                if (createError) throw createError;

                // Create default properties for sample database
                const defaultProperties = [
                    { database_id: newDb.id, name: 'Title', type: 'text', position: 0 },
                    {
                        database_id: newDb.id, name: 'Status', type: 'select', position: 1, options: [
                            { id: '1', name: 'To Do', color: '#ef4444' },
                            { id: '2', name: 'In Progress', color: '#f97316' },
                            { id: '3', name: 'Done', color: '#22c55e' },
                        ]
                    },
                    {
                        database_id: newDb.id, name: 'Priority', type: 'select', position: 2, options: [
                            { id: '1', name: 'High', color: '#ef4444' },
                            { id: '2', name: 'Medium', color: '#f97316' },
                            { id: '3', name: 'Low', color: '#22c55e' },
                        ]
                    },
                    { database_id: newDb.id, name: 'Due Date', type: 'date', position: 3 },
                ];

                await supabase.from('database_properties').insert(defaultProperties);

                // Create default view
                await supabase.from('database_views').insert({
                    database_id: newDb.id,
                    name: 'All Tasks',
                    type: 'table',
                    position: 0,
                });

                // Reload after creating sample
                return loadDatabases();
            }

            // Load properties, rows, and views for each database
            const loadedDatabases: Database[] = await Promise.all(
                dbData.map(async (db) => {
                    const [propsRes, rowsRes, viewsRes] = await Promise.all([
                        supabase.from('database_properties').select('*').eq('database_id', db.id).order('position'),
                        supabase.from('database_rows').select('*').eq('database_id', db.id).order('created_at'),
                        supabase.from('database_views').select('*').eq('database_id', db.id).order('position'),
                    ]);

                    return {
                        id: db.id,
                        name: db.name,
                        description: db.description,
                        icon: db.icon,
                        teamId: db.team_id,
                        createdAt: db.created_at,
                        properties: (propsRes.data || []).map(p => ({
                            id: p.id,
                            name: p.name,
                            type: p.type as PropertyType,
                            options: p.options,
                            formula: p.formula,
                            relationDatabaseId: p.relation_database_id,
                            rollupProperty: p.rollup_property,
                        })),
                        rows: (rowsRes.data || []).map(r => ({
                            id: r.id,
                            properties: r.properties,
                            createdAt: r.created_at,
                            createdBy: r.created_by,
                            updatedAt: r.updated_at,
                            updatedBy: r.updated_by,
                        })),
                        views: (viewsRes.data || []).map(v => ({
                            id: v.id,
                            name: v.name,
                            type: v.type as DatabaseView['type'],
                            filters: v.filters,
                            sorts: v.sorts,
                            groupBy: v.group_by,
                            visibleProperties: v.visible_properties,
                        })),
                    };
                })
            );

            setDatabases(loadedDatabases);
            if (loadedDatabases.length > 0 && !selectedDatabase) {
                setSelectedDatabase(loadedDatabases[0]);
            }
        } catch (error) {
            console.error('Failed to load databases:', error);
            toast.error(t('database.loadError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateDatabase = async () => {
        if (!newDatabaseName.trim() || !currentTeam) return;

        try {
            // Create database in Supabase
            const { data: newDb, error: dbError } = await supabase
                .from('databases')
                .insert({
                    team_id: currentTeam.id,
                    name: newDatabaseName,
                    icon: '📊',
                })
                .select()
                .single();

            if (dbError) throw dbError;

            // Create default properties
            const defaultProps = [
                { database_id: newDb.id, name: 'Name', type: 'text', position: 0 },
                { database_id: newDb.id, name: 'Tags', type: 'multi_select', position: 1, options: [] },
            ];
            await supabase.from('database_properties').insert(defaultProps);

            // Create default view
            await supabase.from('database_views').insert({
                database_id: newDb.id,
                name: 'All',
                type: 'table',
                position: 0,
            });

            setShowNewDatabaseDialog(false);
            setNewDatabaseName('');
            toast.success(t('database.created'));

            // Reload to get full data
            await loadDatabases();
        } catch (error) {
            console.error('Failed to create database:', error);
            toast.error(t('database.loadError'));
        }
    };

    const handleAddRow = async () => {
        if (!selectedDatabase) return;

        try {
            // Insert row in Supabase
            const { data: newRow, error } = await supabase
                .from('database_rows')
                .insert({
                    database_id: selectedDatabase.id,
                    properties: {},
                })
                .select()
                .single();

            if (error) throw error;

            // Update local state
            const updatedRow: DatabaseRow = {
                id: newRow.id,
                properties: newRow.properties,
                createdAt: newRow.created_at,
                createdBy: newRow.created_by,
                updatedAt: newRow.updated_at,
                updatedBy: newRow.updated_by,
            };

            const updatedDatabase = {
                ...selectedDatabase,
                rows: [...selectedDatabase.rows, updatedRow]
            };

            setSelectedDatabase(updatedDatabase);
            setDatabases(databases.map(db =>
                db.id === selectedDatabase.id ? updatedDatabase : db
            ));
        } catch (error) {
            console.error('Failed to add row:', error);
            toast.error(t('database.loadError'));
        }
    };

    const handleAddProperty = (type: PropertyType) => {
        if (!selectedDatabase) return;

        const newProperty: DatabaseProperty = {
            id: Date.now().toString(),
            name: `New ${type}`,
            type,
            options: type === 'select' || type === 'multi_select' ? [] : undefined,
        };

        const updatedDatabase = {
            ...selectedDatabase,
            properties: [...selectedDatabase.properties, newProperty]
        };

        setSelectedDatabase(updatedDatabase);
        setDatabases(databases.map(db =>
            db.id === selectedDatabase.id ? updatedDatabase : db
        ));
    };

    const getCellValue = (row: DatabaseRow, property: DatabaseProperty) => {
        const value = row.properties[property.id];

        switch (property.type) {
            case 'select': {
                const option = property.options?.find(o => o.id === value);
                return option ? (
                    <Badge
                        style={{ backgroundColor: option.color + '20', color: option.color, borderColor: option.color }}
                        variant="outline"
                    >
                        {option.name}
                    </Badge>
                ) : null;
            }
            case 'date':
                return value ? format(new Date(value as string), 'MMM d, yyyy') : null;
            case 'checkbox':
                return value ? '✓' : '○';
            case 'url':
                return value ? (
                    <a href={value as string} target="_blank" rel="noopener" className="text-primary hover:underline">
                        {value as string}
                    </a>
                ) : null;
            default:
                return value as string;
        }
    };

    const filteredRows = useMemo(() => {
        if (!selectedDatabase || !searchQuery) return selectedDatabase?.rows || [];

        return selectedDatabase.rows.filter(row => {
            return Object.values(row.properties).some(value =>
                String(value).toLowerCase().includes(searchQuery.toLowerCase())
            );
        });
    }, [selectedDatabase, searchQuery]);

    // View Components
    const TableView = () => (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        {selectedDatabase?.properties.map(prop => (
                            <TableHead key={prop.id} className="min-w-[150px]">
                                <div className="flex items-center gap-2">
                                    {React.createElement(PROPERTY_ICONS[prop.type] || Type, { className: 'h-4 w-4 text-muted-foreground' })}
                                    {prop.name}
                                </div>
                            </TableHead>
                        ))}
                        <TableHead className="w-[50px]">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleAddProperty('text')}>
                                        <Type className="h-4 w-4 mr-2" /> Text
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAddProperty('number')}>
                                        <Hash className="h-4 w-4 mr-2" /> Number
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAddProperty('select')}>
                                        <Tag className="h-4 w-4 mr-2" /> Select
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAddProperty('date')}>
                                        <CalendarIcon className="h-4 w-4 mr-2" /> Date
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAddProperty('checkbox')}>
                                        <CheckSquare className="h-4 w-4 mr-2" /> Checkbox
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleAddProperty('url')}>
                                        <Link className="h-4 w-4 mr-2" /> URL
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredRows.map(row => (
                        <TableRow key={row.id} className="hover:bg-muted/50 cursor-pointer">
                            {selectedDatabase?.properties.map(prop => (
                                <TableCell key={prop.id}>
                                    {getCellValue(row, prop)}
                                </TableCell>
                            ))}
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem>
                                            <Edit className="h-4 w-4 mr-2" /> {t('common.edit')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Copy className="h-4 w-4 mr-2" /> {t('common.duplicate')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive">
                                            <Trash2 className="h-4 w-4 mr-2" /> {t('common.delete')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                    {/* New row button */}
                    <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={handleAddRow}>
                        <TableCell colSpan={(selectedDatabase?.properties.length || 0) + 1}>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Plus className="h-4 w-4" />
                                {t('database.newRow')}
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );

    const BoardView = () => {
        const groupByProperty = selectedDatabase?.properties.find(p => p.type === 'select' || p.type === 'status');

        if (!groupByProperty?.options) {
            return <div className="text-center text-muted-foreground p-8">{t('database.noGroupProperty')}</div>;
        }

        return (
            <div className="flex gap-4 overflow-x-auto pb-4">
                {groupByProperty.options.map(option => {
                    const columnRows = filteredRows.filter(row => row.properties[groupByProperty.id] === option.id);

                    return (
                        <div key={option.id} className="flex-shrink-0 w-72">
                            <div
                                className="flex items-center gap-2 p-3 rounded-t-lg"
                                style={{ backgroundColor: option.color + '20' }}
                            >
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: option.color }}
                                />
                                <span className="font-medium">{option.name}</span>
                                <Badge variant="secondary" className="ml-auto">{columnRows.length}</Badge>
                            </div>
                            <div className="bg-muted/30 rounded-b-lg p-2 min-h-[200px] space-y-2">
                                {columnRows.map(row => (
                                    <Card key={row.id} className="cursor-pointer hover:shadow-md transition-shadow">
                                        <CardContent className="p-3">
                                            <p className="font-medium">{row.properties['title'] as string || 'Untitled'}</p>
                                            <div className="flex gap-2 mt-2">
                                                {selectedDatabase?.properties
                                                    .filter(p => p.id !== 'title' && p.id !== groupByProperty.id)
                                                    .slice(0, 2)
                                                    .map(prop => (
                                                        <span key={prop.id} className="text-xs text-muted-foreground">
                                                            {getCellValue(row, prop)}
                                                        </span>
                                                    ))
                                                }
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full"
                                    onClick={handleAddRow}
                                >
                                    <Plus className="h-4 w-4 mr-1" /> {t('database.addCard')}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="h-full flex">
                {/* Database Sidebar */}
                <aside className="w-64 border-r bg-muted/20 p-4 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-lg">{t('database.title')}</h2>
                        <Dialog open={showNewDatabaseDialog} onOpenChange={setShowNewDatabaseDialog}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('database.createNew')}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <Input
                                        placeholder={t('database.namePlaceholder')}
                                        value={newDatabaseName}
                                        onChange={(e) => setNewDatabaseName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateDatabase()}
                                    />
                                    <Button onClick={handleCreateDatabase} className="w-full">
                                        {t('database.create')}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <ScrollArea className="h-[calc(100vh-200px)]">
                        <div className="space-y-1">
                            {databases.map(db => (
                                <button
                                    key={db.id}
                                    onClick={() => setSelectedDatabase(db)}
                                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${selectedDatabase?.id === db.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-muted'
                                        }`}
                                >
                                    <span className="text-lg">{db.icon || '📊'}</span>
                                    <span className="truncate">{db.name}</span>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-hidden">
                    {selectedDatabase ? (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{selectedDatabase.icon || '📊'}</span>
                                    <div>
                                        <h1 className="text-2xl font-bold">{selectedDatabase.name}</h1>
                                        {selectedDatabase.description && (
                                            <p className="text-muted-foreground text-sm">{selectedDatabase.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm">
                                        <Filter className="h-4 w-4 mr-2" />
                                        {t('database.filter')}
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        <ArrowUpDown className="h-4 w-4 mr-2" />
                                        {t('database.sort')}
                                    </Button>
                                </div>
                            </div>

                            {/* View Tabs & Search */}
                            <div className="flex items-center justify-between mb-4">
                                <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as typeof currentView)}>
                                    <TabsList>
                                        <TabsTrigger value="table" className="gap-2">
                                            <TableIcon className="h-4 w-4" />
                                            {t('database.tableView')}
                                        </TabsTrigger>
                                        <TabsTrigger value="board" className="gap-2">
                                            <Kanban className="h-4 w-4" />
                                            {t('database.boardView')}
                                        </TabsTrigger>
                                        <TabsTrigger value="calendar" className="gap-2">
                                            <Calendar className="h-4 w-4" />
                                            {t('database.calendarView')}
                                        </TabsTrigger>
                                        <TabsTrigger value="list" className="gap-2">
                                            <List className="h-4 w-4" />
                                            {t('database.listView')}
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>

                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('database.search')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            {/* Content */}
                            <ScrollArea className="h-[calc(100vh-280px)]">
                                {currentView === 'table' && <TableView />}
                                {currentView === 'board' && <BoardView />}
                                {currentView === 'calendar' && (
                                    <div className="text-center text-muted-foreground p-8">
                                        {t('database.calendarComingSoon')}
                                    </div>
                                )}
                                {currentView === 'list' && (
                                    <div className="space-y-2">
                                        {filteredRows.map(row => (
                                            <Card key={row.id} className="cursor-pointer hover:shadow-sm transition-shadow">
                                                <CardContent className="flex items-center justify-between p-4">
                                                    <span className="font-medium">{row.properties['title'] as string || 'Untitled'}</span>
                                                    <div className="flex items-center gap-4">
                                                        {selectedDatabase.properties
                                                            .filter(p => p.id !== 'title')
                                                            .slice(0, 3)
                                                            .map(prop => (
                                                                <span key={prop.id} className="text-sm text-muted-foreground">
                                                                    {getCellValue(row, prop)}
                                                                </span>
                                                            ))
                                                        }
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        <Button variant="ghost" className="w-full" onClick={handleAddRow}>
                                            <Plus className="h-4 w-4 mr-2" /> {t('database.newRow')}
                                        </Button>
                                    </div>
                                )}
                            </ScrollArea>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="text-6xl mb-4">📊</div>
                            <h2 className="text-2xl font-bold mb-2">{t('database.noDatabase')}</h2>
                            <p className="text-muted-foreground mb-4">{t('database.noDatabaseDesc')}</p>
                            <Button onClick={() => setShowNewDatabaseDialog(true)}>
                                <Plus className="h-4 w-4 mr-2" /> {t('database.createFirst')}
                            </Button>
                        </div>
                    )}
                </main>
            </div>
        </AppLayout>
    );
}

export default DatabasePage;
