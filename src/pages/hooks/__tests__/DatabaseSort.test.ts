import { describe, it, expect } from 'vitest';
import type { DatabaseProperty, DatabaseRow, SortCondition } from '../databaseTypes';

// Re-implement the sort logic for unit testing (extracted from useDatabaseHandlers)
function sortRows(rows: DatabaseRow[], sorts: SortCondition[], properties: DatabaseProperty[]): DatabaseRow[] {
    return [...rows].sort((a, b) => {
        for (const sort of sorts) {
            const prop = properties.find(p => p.id === sort.propertyId);
            if (!prop) continue;
            const aVal = a.properties[sort.propertyId];
            const bVal = b.properties[sort.propertyId];
            let comparison = 0;
            if (aVal == null && bVal == null) continue;
            if (aVal == null) { comparison = -1; }
            else if (bVal == null) { comparison = 1; }
            else if (prop.type === 'number') {
                comparison = Number(aVal) - Number(bVal);
            } else if (prop.type === 'date') {
                comparison = new Date(aVal as string).getTime() - new Date(bVal as string).getTime();
            } else if (prop.type === 'checkbox') {
                comparison = (aVal === bVal) ? 0 : aVal ? 1 : -1;
            } else if (prop.type === 'select') {
                const aOpt = prop.options?.find(o => o.id === aVal)?.name || '';
                const bOpt = prop.options?.find(o => o.id === bVal)?.name || '';
                comparison = aOpt.localeCompare(bOpt);
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }
            if (comparison !== 0) return sort.direction === 'desc' ? -comparison : comparison;
        }
        return 0;
    });
}

const makeRow = (id: string, props: Record<string, unknown>): DatabaseRow => ({
    id, properties: props, createdAt: '', createdBy: '', updatedAt: '', updatedBy: '',
});

const textProp: DatabaseProperty = { id: 'name', name: 'Name', type: 'text' };
const numberProp: DatabaseProperty = { id: 'age', name: 'Age', type: 'number' };
const dateProp: DatabaseProperty = { id: 'date', name: 'Date', type: 'date' };
const checkProp: DatabaseProperty = { id: 'done', name: 'Done', type: 'checkbox' };
const selectProp: DatabaseProperty = {
    id: 'status', name: 'Status', type: 'select',
    options: [
        { id: 'a', name: 'Alpha', color: '#000' },
        { id: 'b', name: 'Beta', color: '#000' },
        { id: 'c', name: 'Charlie', color: '#000' },
    ],
};

const allProps = [textProp, numberProp, dateProp, checkProp, selectProp];

describe('Database Sort Logic', () => {
    it('should sort text ascending', () => {
        const rows = [makeRow('1', { name: 'Charlie' }), makeRow('2', { name: 'Alice' }), makeRow('3', { name: 'Bob' })];
        const sorted = sortRows(rows, [{ id: '1', propertyId: 'name', direction: 'asc' }], allProps);
        expect(sorted.map(r => r.properties.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should sort text descending', () => {
        const rows = [makeRow('1', { name: 'Alice' }), makeRow('2', { name: 'Charlie' }), makeRow('3', { name: 'Bob' })];
        const sorted = sortRows(rows, [{ id: '1', propertyId: 'name', direction: 'desc' }], allProps);
        expect(sorted.map(r => r.properties.name)).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('should sort numbers ascending', () => {
        const rows = [makeRow('1', { age: 30 }), makeRow('2', { age: 10 }), makeRow('3', { age: 20 })];
        const sorted = sortRows(rows, [{ id: '1', propertyId: 'age', direction: 'asc' }], allProps);
        expect(sorted.map(r => r.properties.age)).toEqual([10, 20, 30]);
    });

    it('should sort dates ascending', () => {
        const rows = [
            makeRow('1', { date: '2025-03-01' }),
            makeRow('2', { date: '2025-01-01' }),
            makeRow('3', { date: '2025-02-01' }),
        ];
        const sorted = sortRows(rows, [{ id: '1', propertyId: 'date', direction: 'asc' }], allProps);
        expect(sorted.map(r => r.properties.date)).toEqual(['2025-01-01', '2025-02-01', '2025-03-01']);
    });

    it('should handle null values (nulls first in asc)', () => {
        const rows = [makeRow('1', { age: 30 }), makeRow('2', {}), makeRow('3', { age: 10 })];
        const sorted = sortRows(rows, [{ id: '1', propertyId: 'age', direction: 'asc' }], allProps);
        expect(sorted.map(r => r.id)).toEqual(['2', '3', '1']);
    });

    it('should sort select by option name', () => {
        const rows = [makeRow('1', { status: 'c' }), makeRow('2', { status: 'a' }), makeRow('3', { status: 'b' })];
        const sorted = sortRows(rows, [{ id: '1', propertyId: 'status', direction: 'asc' }], allProps);
        expect(sorted.map(r => r.properties.status)).toEqual(['a', 'b', 'c']);
    });

    it('should sort checkbox (false before true in asc)', () => {
        const rows = [makeRow('1', { done: true }), makeRow('2', { done: false }), makeRow('3', { done: true })];
        const sorted = sortRows(rows, [{ id: '1', propertyId: 'done', direction: 'asc' }], allProps);
        expect(sorted[0].properties.done).toBe(false);
    });

    it('should handle multi-level sort', () => {
        const rows = [
            makeRow('1', { name: 'Alice', age: 30 }),
            makeRow('2', { name: 'Alice', age: 20 }),
            makeRow('3', { name: 'Bob', age: 25 }),
        ];
        const sorted = sortRows(rows, [
            { id: '1', propertyId: 'name', direction: 'asc' },
            { id: '2', propertyId: 'age', direction: 'asc' },
        ], allProps);
        expect(sorted.map(r => r.id)).toEqual(['2', '1', '3']);
    });

    it('should return stable order with no sorts', () => {
        const rows = [makeRow('1', {}), makeRow('2', {}), makeRow('3', {})];
        const sorted = sortRows(rows, [], allProps);
        expect(sorted.map(r => r.id)).toEqual(['1', '2', '3']);
    });
});
