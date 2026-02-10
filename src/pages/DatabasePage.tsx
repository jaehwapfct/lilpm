import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
    Plus, Search, MoreHorizontal, ExternalLink,
    Trash2, Copy,
    Hash, Type, CalendarIcon,
    Link, CheckSquare, Tag, Mail, Phone, User, ToggleLeft,
    MousePointerClick, ListOrdered
} from 'lucide-react';
import { format } from 'date-fns';
import {
    useDatabaseHandlers,
    EditableCell,
    PROPERTY_ICONS,
    DatabaseFilterBuilder,
    DatabaseSortBuilder,
    DatabaseRowSidePeek,
    DatabaseCalendarView,
    DatabaseGalleryView,
    DatabasePropertyToggle,
    DatabaseGroupBy,
    GroupedRows,
    DatabaseSummaryRow,
    DatabaseViewManager,
    DatabaseCSVHandler,
    DragDropContext,
    SortableRow,
    ResizeHandle,
    useColumnResize,
    DatabaseTimelineView,
    DatabaseChartView,
    DatabaseFormView,
    DatabaseConditionalFormatButton,
    getRowFormatStyle,
} from './hooks';
import type { DatabaseRow, DatabaseProperty, ConditionalFormat } from './hooks';

export function DatabasePage() {
    const { t } = useTranslation();
    const [sidePeekRow, setSidePeekRow] = useState<DatabaseRow | null>(null);
    const [sidePeekOpen, setSidePeekOpen] = useState(false);

    const {
        databases,
        selectedDatabase,
        setSelectedDatabase,
        isLoading,
        searchQuery,
        setSearchQuery,
        showNewDatabaseDialog,
        setShowNewDatabaseDialog,
        newDatabaseName,
        setNewDatabaseName,
        filteredRows,
        handleCreateDatabase,
        handleAddRow,
        handleAddProperty,
        handleUpdateCell,
        handleDeleteRow,
        handleDuplicateRow,
        handleAddSelectOption,
        filterGroup,
        setFilterGroup,
        sortConditions,
        setSortConditions,
        activeViewId,
        setActiveViewId,
        activeView,
        visibleProperties,
        setVisibleProperties,
        groupByPropertyId,
        setGroupByPropertyId,
        handleCreateView,
        handleDeleteView,
        handleRenameView,
        handleAddSubItem,
        handleImportRows,
        handleReorderRows,
        handleReorderProperties,
        getRelatedDatabase,
    } = useDatabaseHandlers();

    // Column resize
    const { columnWidths, startResize } = useColumnResize({});

    // Conditional formatting
    const [conditionalFormats, setConditionalFormats] = useState<ConditionalFormat[]>([]);

    const openSidePeek = useCallback((row: DatabaseRow) => {
        setSidePeekRow(row);
        setSidePeekOpen(true);
    }, []);

    // Current view type from the active view
    const currentViewType = activeView?.type || 'table';

    // Visible properties for display
    const displayProperties = selectedDatabase?.properties.filter(p => visibleProperties.includes(p.id)) || [];

    // Read-only cell value renderer (for Board/List views)
    const getCellValue = (row: DatabaseRow, property: DatabaseProperty) => {
        const value = row.properties[property.id];
        switch (property.type) {
            case 'select':
            case 'status': {
                const option = property.options?.find(o => o.id === value);
                return option ? (
                    <Badge style={{ backgroundColor: option.color + '20', color: option.color, borderColor: option.color }} variant="outline" className="text-xs">
                        {option.name}
                    </Badge>
                ) : null;
            }
            case 'multi_select': {
                const ids = (value as string[]) || [];
                return (property.options?.filter(o => ids.includes(o.id)) || []).map(option => (
                    <Badge key={option.id} style={{ backgroundColor: option.color + '20', color: option.color, borderColor: option.color }} variant="outline" className="text-xs">
                        {option.name}
                    </Badge>
                ));
            }
            case 'date':
                return value ? <span className="text-xs">{format(new Date(value as string), 'MMM d, yyyy')}</span> : null;
            case 'checkbox':
                return <span className="text-xs">{value ? '✓' : '○'}</span>;
            case 'url':
                return value ? (
                    <a href={value as string} target="_blank" rel="noopener" className="text-primary hover:underline text-xs truncate">
                        {value as string}
                    </a>
                ) : null;
            default:
                return <span className="text-xs">{value as string}</span>;
        }
    };

    const makeCellUpdater = useCallback((rowId: string, propertyId: string) => {
        return (value: unknown) => handleUpdateCell(rowId, propertyId, value);
    }, [handleUpdateCell]);

    const makeOptionAdder = useCallback((propertyId: string) => {
        return (name: string) => handleAddSelectOption(propertyId, name);
    }, [handleAddSelectOption]);

    // ── Property Add Menu (reusable) ───────────────────────
    const PropertyAddMenu = () => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm"><Plus className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleAddProperty('text')}><Type className="h-4 w-4 mr-2" /> Text</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddProperty('number')}><Hash className="h-4 w-4 mr-2" /> Number</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddProperty('select')}><Tag className="h-4 w-4 mr-2" /> Select</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddProperty('multi_select')}><Tag className="h-4 w-4 mr-2" /> Multi-select</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddProperty('status')}><ToggleLeft className="h-4 w-4 mr-2" /> Status</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddProperty('date')}><CalendarIcon className="h-4 w-4 mr-2" /> Date</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddProperty('checkbox')}><CheckSquare className="h-4 w-4 mr-2" /> Checkbox</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAddProperty('url')}><Link className="h-4 w-4 mr-2" /> URL</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddProperty('email')}><Mail className="h-4 w-4 mr-2" /> Email</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddProperty('phone')}><Phone className="h-4 w-4 mr-2" /> Phone</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddProperty('person')}><User className="h-4 w-4 mr-2" /> Person</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleAddProperty('button')}><MousePointerClick className="h-4 w-4 mr-2" /> Button</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddProperty('auto_id')}><ListOrdered className="h-4 w-4 mr-2" /> ID (Auto)</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    // ── Table View ─────────────────────────────────────────
    const TableView = () => {
        const groupProp = groupByPropertyId ? selectedDatabase?.properties.find(p => p.id === groupByPropertyId) : null;

        const renderTable = (rows: DatabaseRow[], groupLabel?: string, groupColor?: string) => (
            <div className="border rounded-lg overflow-hidden border-white/10 mb-4">
                {groupLabel && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border-b border-white/10">
                        {groupColor && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: groupColor }} />}
                        <span className="text-sm font-medium">{groupLabel}</span>
                        <Badge variant="secondary" className="text-xs">{rows.length}</Badge>
                    </div>
                )}
                <DragDropContext items={rows.map(r => r.id)} onReorder={handleReorderRows}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30px]" /> {/* Drag handle column */}
                            {displayProperties.map(prop => (
                                <TableHead
                                    key={prop.id}
                                    className="min-w-[100px] relative"
                                    style={{ width: columnWidths[prop.id] || 150 }}
                                >
                                    <div className="flex items-center gap-2">
                                        {React.createElement(PROPERTY_ICONS[prop.type] || Type, { className: 'h-4 w-4 text-slate-400' })}
                                        {prop.name}
                                    </div>
                                    <ResizeHandle columnId={prop.id} onResizeStart={startResize} />
                                </TableHead>
                            ))}
                            <TableHead className="w-[50px]"><PropertyAddMenu /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.map(row => (
                            <SortableRow key={row.id} id={row.id} className="hover:bg-white/5 group" style={getRowFormatStyle(row.properties, conditionalFormats, selectedDatabase?.properties || [])}>
                                {displayProperties.map(prop => (
                                    <TableCell key={prop.id} className="p-1">
                                        <EditableCell
                                            value={row.properties[prop.id]}
                                            property={prop}
                                            onUpdate={makeCellUpdater(row.id, prop.id)}
                                            onAddOption={
                                                ['select', 'multi_select', 'status'].includes(prop.type)
                                                    ? makeOptionAdder(prop.id)
                                                    : undefined
                                            }
                                        />
                                    </TableCell>
                                ))}
                                <TableCell className="p-1">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => openSidePeek(row)}>
                                                <ExternalLink className="h-4 w-4 mr-2" /> Open
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleDuplicateRow(row.id)}>
                                                <Copy className="h-4 w-4 mr-2" /> {t('common.duplicate')}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteRow(row.id)}>
                                                <Trash2 className="h-4 w-4 mr-2" /> {t('common.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </SortableRow>
                        ))}
                        {/* New row */}
                        <TableRow className="hover:bg-white/5 cursor-pointer" onClick={handleAddRow}>
                            <TableCell colSpan={displayProperties.length + 2}>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Plus className="h-4 w-4" /> {t('database.newRow')}
                                </div>
                            </TableCell>
                        </TableRow>
                        {/* Summary row */}
                        <DatabaseSummaryRow rows={rows} properties={selectedDatabase?.properties || []} visibleProperties={visibleProperties} />
                    </TableBody>
                </Table>
                </DragDropContext>
            </div>
        );

        if (groupProp) {
            return (
                <GroupedRows
                    rows={filteredRows}
                    groupProperty={groupProp}
                    renderGroup={(label, color, rows) => renderTable(rows as DatabaseRow[], label, color)}
                />
            );
        }

        return renderTable(filteredRows);
    };

    // ── Board View ─────────────────────────────────────────
    const BoardView = () => {
        const groupByProperty = groupByPropertyId
            ? selectedDatabase?.properties.find(p => p.id === groupByPropertyId)
            : selectedDatabase?.properties.find(p => p.type === 'select' || p.type === 'status');

        if (!groupByProperty?.options) {
            return (
                <div className="flex flex-col items-center justify-center text-slate-400 p-12 border rounded-lg border-dashed border-white/10">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="font-medium mb-1">{t('database.noGroupProperty')}</p>
                    <p className="text-sm text-slate-500">Add a select or status property, or use Group By.</p>
                </div>
            );
        }

        return (
            <div className="flex gap-4 overflow-x-auto pb-4">
                {groupByProperty.options.map(option => {
                    const columnRows = filteredRows.filter(row => row.properties[groupByProperty.id] === option.id);
                    return (
                        <div key={option.id} className="flex-shrink-0 w-72">
                            <div className="flex items-center gap-2 p-3 rounded-t-lg" style={{ backgroundColor: option.color + '20' }}>
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: option.color }} />
                                <span className="font-medium">{option.name}</span>
                                <Badge variant="secondary" className="ml-auto">{columnRows.length}</Badge>
                            </div>
                            <div className="bg-[#121215] rounded-b-lg p-2 min-h-[200px] space-y-2">
                                {columnRows.map(row => (
                                    <Card key={row.id} className="cursor-pointer hover:shadow-md transition-shadow group" onClick={() => openSidePeek(row)}>
                                        <CardContent className="p-3">
                                            <div className="flex items-start justify-between">
                                                <p className="font-medium text-sm">{row.properties['title'] as string || 'Untitled'}</p>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onClick={() => handleDuplicateRow(row.id)}>
                                                            <Copy className="h-4 w-4 mr-2" /> {t('common.duplicate')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteRow(row.id)}>
                                                            <Trash2 className="h-4 w-4 mr-2" /> {t('common.delete')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                {displayProperties
                                                    .filter(p => p.id !== 'title' && p.id !== groupByProperty.id)
                                                    .slice(0, 2)
                                                    .map(prop => (
                                                        <span key={prop.id} className="text-xs text-slate-400">{getCellValue(row, prop)}</span>
                                                    ))
                                                }
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                <Button variant="ghost" size="sm" className="w-full" onClick={handleAddRow}>
                                    <Plus className="h-4 w-4 mr-1" /> {t('database.addCard')}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ── List View ──────────────────────────────────────────
    const ListView = () => {
        const groupProp = groupByPropertyId ? selectedDatabase?.properties.find(p => p.id === groupByPropertyId) : null;

        const renderList = (rows: DatabaseRow[], groupLabel?: string, groupColor?: string) => (
            <div className="mb-4">
                {groupLabel && (
                    <div className="flex items-center gap-2 mb-2">
                        {groupColor && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: groupColor }} />}
                        <span className="text-sm font-medium">{groupLabel}</span>
                        <Badge variant="secondary" className="text-xs">{rows.length}</Badge>
                    </div>
                )}
                <div className="space-y-2">
                    {rows.map(row => (
                        <Card key={row.id} className="cursor-pointer hover:shadow-sm transition-shadow group" onClick={() => openSidePeek(row)}>
                            <CardContent className="flex items-center justify-between p-4">
                                <span className="font-medium text-sm">{row.properties['title'] as string || 'Untitled'}</span>
                                <div className="flex items-center gap-3">
                                    {displayProperties
                                        .filter(p => p.id !== 'title')
                                        .slice(0, 3)
                                        .map(prop => (
                                            <span key={prop.id} className="text-sm text-slate-400">{getCellValue(row, prop)}</span>
                                        ))
                                    }
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => handleDuplicateRow(row.id)}>
                                                <Copy className="h-4 w-4 mr-2" /> {t('common.duplicate')}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteRow(row.id)}>
                                                <Trash2 className="h-4 w-4 mr-2" /> {t('common.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );

        if (groupProp) {
            return (
                <>
                    <GroupedRows
                        rows={filteredRows}
                        groupProperty={groupProp}
                        renderGroup={(label, color, rows) => renderList(rows as DatabaseRow[], label, color)}
                    />
                    <Button variant="ghost" className="w-full" onClick={handleAddRow}>
                        <Plus className="h-4 w-4 mr-2" /> {t('database.newRow')}
                    </Button>
                </>
            );
        }

        return (
            <>
                {renderList(filteredRows)}
                <Button variant="ghost" className="w-full" onClick={handleAddRow}>
                    <Plus className="h-4 w-4 mr-2" /> {t('database.newRow')}
                </Button>
            </>
        );
    };

    // ── Loading ────────────────────────────────────────────
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
                <aside className="w-64 border-r border-white/10 bg-[#121215] p-4 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-lg">{t('database.title')}</h2>
                        <Dialog open={showNewDatabaseDialog} onOpenChange={setShowNewDatabaseDialog}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm"><Plus className="h-4 w-4" /></Button>
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
                                    <Button onClick={handleCreateDatabase} className="w-full">{t('database.create')}</Button>
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
                                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${
                                        selectedDatabase?.id === db.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'hover:bg-white/5'
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
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{selectedDatabase.icon || '📊'}</span>
                                    <div>
                                        <h1 className="text-2xl font-bold">{selectedDatabase.name}</h1>
                                        {selectedDatabase.description && (
                                            <p className="text-slate-400 text-sm">{selectedDatabase.description}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* View Tabs (View Manager) */}
                            <div className="flex items-center justify-between mb-3">
                                <DatabaseViewManager
                                    views={selectedDatabase.views}
                                    activeViewId={activeView?.id || null}
                                    onViewChange={setActiveViewId}
                                    onCreateView={handleCreateView}
                                    onDeleteView={handleDeleteView}
                                    onRenameView={handleRenameView}
                                />
                            </div>

                            {/* Toolbar: Filter, Sort, Group, Properties, Search */}
                            <div className="flex items-center justify-between mb-4 gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <DatabaseFilterBuilder
                                        properties={selectedDatabase.properties}
                                        filterGroup={filterGroup}
                                        onFilterChange={setFilterGroup}
                                        activeFilterCount={filterGroup.conditions.length}
                                    />
                                    <DatabaseSortBuilder
                                        properties={selectedDatabase.properties}
                                        sortConditions={sortConditions}
                                        onSortChange={setSortConditions}
                                    />
                                    <DatabaseGroupBy
                                        properties={selectedDatabase.properties}
                                        groupByPropertyId={groupByPropertyId}
                                        onGroupByChange={setGroupByPropertyId}
                                    />
                                    <DatabasePropertyToggle
                                        properties={selectedDatabase.properties}
                                        visibleProperties={visibleProperties}
                                        onVisibleChange={setVisibleProperties}
                                    />
                                    <DatabaseConditionalFormatButton
                                        properties={selectedDatabase.properties}
                                        formats={conditionalFormats}
                                        onFormatsChange={setConditionalFormats}
                                    />
                                    <DatabaseCSVHandler
                                        databaseName={selectedDatabase.name}
                                        properties={selectedDatabase.properties}
                                        rows={selectedDatabase.rows}
                                        onImport={handleImportRows}
                                    />
                                </div>
                                <div className="relative w-56 flex-shrink-0">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder={t('database.search')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-9"
                                    />
                                </div>
                            </div>

                            {/* Active filter/sort indicators */}
                            {(filterGroup.conditions.length > 0 || sortConditions.length > 0) && (
                                <div className="flex items-center gap-2 mb-3 text-xs">
                                    {filterGroup.conditions.length > 0 && (
                                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                            {filterGroup.conditions.length} filter{filterGroup.conditions.length > 1 ? 's' : ''} active
                                        </Badge>
                                    )}
                                    {sortConditions.length > 0 && (
                                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                                            {sortConditions.length} sort{sortConditions.length > 1 ? 's' : ''} active
                                        </Badge>
                                    )}
                                    <span className="text-slate-400">{filteredRows.length} results</span>
                                </div>
                            )}

                            {/* Content */}
                            <ScrollArea className="h-[calc(100vh-310px)]">
                                {currentViewType === 'table' && <TableView />}
                                {currentViewType === 'board' && <BoardView />}
                                {currentViewType === 'calendar' && (
                                    <DatabaseCalendarView
                                        rows={filteredRows}
                                        properties={selectedDatabase.properties}
                                        onRowClick={openSidePeek}
                                        onAddRow={handleAddRow}
                                    />
                                )}
                                {currentViewType === 'gallery' && (
                                    <DatabaseGalleryView
                                        rows={filteredRows}
                                        properties={selectedDatabase.properties}
                                        visibleProperties={visibleProperties}
                                        onRowClick={openSidePeek}
                                        onAddRow={handleAddRow}
                                        onDeleteRow={handleDeleteRow}
                                        onDuplicateRow={handleDuplicateRow}
                                    />
                                )}
                                {currentViewType === 'list' && <ListView />}
                                {currentViewType === 'timeline' && (
                                    <DatabaseTimelineView
                                        rows={filteredRows}
                                        properties={selectedDatabase.properties}
                                        onRowClick={openSidePeek}
                                    />
                                )}
                                {currentViewType === 'chart' && (
                                    <DatabaseChartView
                                        rows={filteredRows}
                                        properties={selectedDatabase.properties}
                                    />
                                )}
                                {currentViewType === 'form' && (
                                    <DatabaseFormView
                                        databaseName={selectedDatabase.name}
                                        properties={selectedDatabase.properties}
                                        onSubmit={(data) => {
                                            handleAddRow().then(() => {
                                                const lastRow = selectedDatabase.rows[selectedDatabase.rows.length - 1];
                                                if (lastRow) {
                                                    Object.entries(data).forEach(([propId, val]) => {
                                                        handleUpdateCell(lastRow.id, propId, val);
                                                    });
                                                }
                                            });
                                        }}
                                    />
                                )}
                            </ScrollArea>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="text-6xl mb-4">📊</div>
                            <h2 className="text-2xl font-bold mb-2">{t('database.noDatabase')}</h2>
                            <p className="text-slate-400 mb-4">{t('database.noDatabaseDesc')}</p>
                            <Button onClick={() => setShowNewDatabaseDialog(true)}>
                                <Plus className="h-4 w-4 mr-2" /> {t('database.createFirst')}
                            </Button>
                        </div>
                    )}
                </main>
            </div>

            {/* Side Peek Panel */}
            {selectedDatabase && (
                <DatabaseRowSidePeek
                    row={sidePeekRow ? (selectedDatabase.rows.find(r => r.id === sidePeekRow.id) || sidePeekRow) : null}
                    properties={selectedDatabase.properties}
                    open={sidePeekOpen}
                    onOpenChange={(open) => {
                        setSidePeekOpen(open);
                        if (!open) setSidePeekRow(null);
                    }}
                    onUpdateCell={handleUpdateCell}
                    onAddSelectOption={handleAddSelectOption}
                    onDeleteRow={handleDeleteRow}
                    onDuplicateRow={handleDuplicateRow}
                />
            )}
        </AppLayout>
    );
}

export default DatabasePage;
