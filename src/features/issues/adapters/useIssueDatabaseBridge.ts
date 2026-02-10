/**
 * useIssueDatabaseBridge
 * Hook that bridges the Issue Store with Database components.
 * Provides all the handlers that DatabasePage's view components need,
 * backed by the actual issue CRUD operations.
 */

import { useCallback, useMemo, useState } from 'react';
import { useIssueStore } from '@/stores';
import { useTeamStore } from '@/stores/teamStore';
import type { Issue } from '@/types';
import type { DatabaseRow, FilterGroup, SortCondition } from '@/pages/hooks/databaseTypes';
import {
    ISSUE_PROPERTIES,
    issuesToVirtualDatabase,
    issueToDatabaseRow,
    databaseRowToIssueUpdate,
    isReadOnlyProperty,
} from './IssuesDatabaseAdapter';
import { evaluateFilterGroup } from '@/pages/hooks/DatabaseFilterBuilder';

export function useIssueDatabaseBridge() {
    const { currentTeam } = useTeamStore();
    const { issues, updateIssue, createIssue, deleteIssue } = useIssueStore();

    const [filterGroup, setFilterGroup] = useState<FilterGroup>({ combinator: 'and', conditions: [] });
    const [sortConditions, setSortConditions] = useState<SortCondition[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleProperties, setVisibleProperties] = useState<string[]>(ISSUE_PROPERTIES.map(p => p.id));
    const [groupByPropertyId, setGroupByPropertyId] = useState<string | null>(null);

    // Virtual database from issues
    const virtualDatabase = useMemo(() => {
        if (!currentTeam) return null;
        return issuesToVirtualDatabase(issues, currentTeam.id);
    }, [issues, currentTeam]);

    // Filtered + sorted rows
    const filteredRows = useMemo(() => {
        if (!virtualDatabase) return [];
        let rows = virtualDatabase.rows;

        // Search
        if (searchQuery) {
            rows = rows.filter(row =>
                Object.values(row.properties).some(v =>
                    String(v).toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        }

        // Filters
        if (filterGroup.conditions.length > 0) {
            rows = rows.filter(row =>
                evaluateFilterGroup(row.properties, filterGroup, ISSUE_PROPERTIES)
            );
        }

        // Sorts
        if (sortConditions.length > 0) {
            rows = [...rows].sort((a, b) => {
                for (const sort of sortConditions) {
                    const prop = ISSUE_PROPERTIES.find(p => p.id === sort.propertyId);
                    if (!prop) continue;
                    const aVal = a.properties[sort.propertyId];
                    const bVal = b.properties[sort.propertyId];
                    let cmp = 0;
                    if (aVal == null && bVal == null) continue;
                    if (aVal == null) cmp = -1;
                    else if (bVal == null) cmp = 1;
                    else if (prop.type === 'number') cmp = Number(aVal) - Number(bVal);
                    else if (prop.type === 'date' || prop.type === 'created_time' || prop.type === 'last_edited_time') {
                        cmp = new Date(aVal as string).getTime() - new Date(bVal as string).getTime();
                    } else if (prop.type === 'select') {
                        const aOpt = prop.options?.find(o => o.id === aVal)?.name || '';
                        const bOpt = prop.options?.find(o => o.id === bVal)?.name || '';
                        cmp = aOpt.localeCompare(bOpt);
                    } else {
                        cmp = String(aVal).localeCompare(String(bVal));
                    }
                    if (cmp !== 0) return sort.direction === 'desc' ? -cmp : cmp;
                }
                return 0;
            });
        }

        return rows;
    }, [virtualDatabase, searchQuery, filterGroup, sortConditions]);

    // ── Handlers that bridge DB views → Issue CRUD ─────────
    const handleUpdateCell = useCallback(async (rowId: string, propertyId: string, value: unknown) => {
        if (isReadOnlyProperty(propertyId)) return;
        const update = databaseRowToIssueUpdate(propertyId, value);
        if (update) {
            await updateIssue(rowId, update);
        }
    }, [updateIssue]);

    const handleAddRow = useCallback(async () => {
        if (!currentTeam) return;
        await createIssue(currentTeam.id, {
            title: 'New Issue',
            type: 'task',
            status: 'backlog',
            priority: 'none',
        });
    }, [currentTeam, createIssue]);

    const handleDeleteRow = useCallback(async (rowId: string) => {
        await deleteIssue(rowId);
    }, [deleteIssue]);

    // No-op for select option adding (issue fields have fixed options)
    const handleAddSelectOption = useCallback(async () => {
        return undefined;
    }, []);

    return {
        virtualDatabase,
        properties: ISSUE_PROPERTIES,
        filteredRows,
        filterGroup,
        setFilterGroup,
        sortConditions,
        setSortConditions,
        searchQuery,
        setSearchQuery,
        visibleProperties,
        setVisibleProperties,
        groupByPropertyId,
        setGroupByPropertyId,
        handleUpdateCell,
        handleAddRow,
        handleDeleteRow,
        handleAddSelectOption,
    };
}
