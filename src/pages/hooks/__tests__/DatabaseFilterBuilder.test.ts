import { describe, it, expect } from 'vitest';
import { evaluateFilterGroup } from '../DatabaseFilterBuilder';
import type { DatabaseProperty, FilterGroup, FilterCondition } from '../databaseTypes';

const textProp: DatabaseProperty = { id: 'name', name: 'Name', type: 'text' };
const numberProp: DatabaseProperty = { id: 'age', name: 'Age', type: 'number' };
const selectProp: DatabaseProperty = {
    id: 'status', name: 'Status', type: 'select',
    options: [
        { id: 'active', name: 'Active', color: '#22c55e' },
        { id: 'inactive', name: 'Inactive', color: '#ef4444' },
    ],
};
const checkProp: DatabaseProperty = { id: 'done', name: 'Done', type: 'checkbox' };
const dateProp: DatabaseProperty = { id: 'date', name: 'Date', type: 'date' };
const multiProp: DatabaseProperty = {
    id: 'tags', name: 'Tags', type: 'multi_select',
    options: [
        { id: 'a', name: 'Alpha', color: '#3b82f6' },
        { id: 'b', name: 'Beta', color: '#8b5cf6' },
    ],
};

const allProps = [textProp, numberProp, selectProp, checkProp, dateProp, multiProp];

const cond = (propertyId: string, operator: string, value: unknown): FilterCondition => ({
    id: '1', propertyId, operator: operator as FilterCondition['operator'], value,
});

describe('evaluateFilterGroup', () => {
    // ── Text Filters ───────────────────────────────────────
    describe('text filters', () => {
        it('contains', () => {
            expect(evaluateFilterGroup({ name: 'Hello World' }, { combinator: 'and', conditions: [cond('name', 'contains', 'World')] }, allProps)).toBe(true);
            expect(evaluateFilterGroup({ name: 'Hello' }, { combinator: 'and', conditions: [cond('name', 'contains', 'World')] }, allProps)).toBe(false);
        });

        it('not_contains', () => {
            expect(evaluateFilterGroup({ name: 'Hello' }, { combinator: 'and', conditions: [cond('name', 'not_contains', 'World')] }, allProps)).toBe(true);
        });

        it('equals', () => {
            expect(evaluateFilterGroup({ name: 'test' }, { combinator: 'and', conditions: [cond('name', 'equals', 'test')] }, allProps)).toBe(true);
            expect(evaluateFilterGroup({ name: 'Test' }, { combinator: 'and', conditions: [cond('name', 'equals', 'test')] }, allProps)).toBe(true); // case-insensitive
        });

        it('not_equals', () => {
            expect(evaluateFilterGroup({ name: 'hello' }, { combinator: 'and', conditions: [cond('name', 'not_equals', 'world')] }, allProps)).toBe(true);
        });

        it('starts_with', () => {
            expect(evaluateFilterGroup({ name: 'Hello World' }, { combinator: 'and', conditions: [cond('name', 'starts_with', 'hello')] }, allProps)).toBe(true);
        });

        it('ends_with', () => {
            expect(evaluateFilterGroup({ name: 'Hello World' }, { combinator: 'and', conditions: [cond('name', 'ends_with', 'world')] }, allProps)).toBe(true);
        });

        it('is_empty', () => {
            expect(evaluateFilterGroup({ name: '' }, { combinator: 'and', conditions: [cond('name', 'is_empty', null)] }, allProps)).toBe(true);
            expect(evaluateFilterGroup({ name: null }, { combinator: 'and', conditions: [cond('name', 'is_empty', null)] }, allProps)).toBe(true);
            expect(evaluateFilterGroup({}, { combinator: 'and', conditions: [cond('name', 'is_empty', null)] }, allProps)).toBe(true);
        });

        it('is_not_empty', () => {
            expect(evaluateFilterGroup({ name: 'text' }, { combinator: 'and', conditions: [cond('name', 'is_not_empty', null)] }, allProps)).toBe(true);
            expect(evaluateFilterGroup({ name: '' }, { combinator: 'and', conditions: [cond('name', 'is_not_empty', null)] }, allProps)).toBe(false);
        });
    });

    // ── Number Filters ─────────────────────────────────────
    describe('number filters', () => {
        it('equals', () => {
            expect(evaluateFilterGroup({ age: 25 }, { combinator: 'and', conditions: [cond('age', 'equals', 25)] }, allProps)).toBe(true);
        });

        it('greater_than', () => {
            expect(evaluateFilterGroup({ age: 30 }, { combinator: 'and', conditions: [cond('age', 'greater_than', 25)] }, allProps)).toBe(true);
            expect(evaluateFilterGroup({ age: 20 }, { combinator: 'and', conditions: [cond('age', 'greater_than', 25)] }, allProps)).toBe(false);
        });

        it('less_than', () => {
            expect(evaluateFilterGroup({ age: 20 }, { combinator: 'and', conditions: [cond('age', 'less_than', 25)] }, allProps)).toBe(true);
        });

        it('greater_equal', () => {
            expect(evaluateFilterGroup({ age: 25 }, { combinator: 'and', conditions: [cond('age', 'greater_equal', 25)] }, allProps)).toBe(true);
        });

        it('less_equal', () => {
            expect(evaluateFilterGroup({ age: 25 }, { combinator: 'and', conditions: [cond('age', 'less_equal', 25)] }, allProps)).toBe(true);
        });
    });

    // ── Select Filters ─────────────────────────────────────
    describe('select filters', () => {
        it('equals', () => {
            expect(evaluateFilterGroup({ status: 'active' }, { combinator: 'and', conditions: [cond('status', 'equals', 'active')] }, allProps)).toBe(true);
        });

        it('not_equals', () => {
            expect(evaluateFilterGroup({ status: 'active' }, { combinator: 'and', conditions: [cond('status', 'not_equals', 'inactive')] }, allProps)).toBe(true);
        });
    });

    // ── Checkbox Filters ───────────────────────────────────
    describe('checkbox filters', () => {
        it('equals true', () => {
            expect(evaluateFilterGroup({ done: true }, { combinator: 'and', conditions: [cond('done', 'equals', true)] }, allProps)).toBe(true);
            expect(evaluateFilterGroup({ done: false }, { combinator: 'and', conditions: [cond('done', 'equals', true)] }, allProps)).toBe(false);
        });

        it('equals false', () => {
            expect(evaluateFilterGroup({ done: false }, { combinator: 'and', conditions: [cond('done', 'equals', false)] }, allProps)).toBe(true);
        });
    });

    // ── Multi-select Filters ───────────────────────────────
    describe('multi_select filters', () => {
        it('contains', () => {
            expect(evaluateFilterGroup({ tags: ['a', 'b'] }, { combinator: 'and', conditions: [cond('tags', 'contains', 'a')] }, allProps)).toBe(true);
            expect(evaluateFilterGroup({ tags: ['b'] }, { combinator: 'and', conditions: [cond('tags', 'contains', 'a')] }, allProps)).toBe(false);
        });

        it('not_contains', () => {
            expect(evaluateFilterGroup({ tags: ['b'] }, { combinator: 'and', conditions: [cond('tags', 'not_contains', 'a')] }, allProps)).toBe(true);
        });

        it('is_empty', () => {
            expect(evaluateFilterGroup({ tags: [] }, { combinator: 'and', conditions: [cond('tags', 'is_empty', null)] }, allProps)).toBe(true);
        });
    });

    // ── Date Filters ───────────────────────────────────────
    describe('date filters', () => {
        it('is_before', () => {
            expect(evaluateFilterGroup(
                { date: '2025-01-01' },
                { combinator: 'and', conditions: [cond('date', 'is_before', '2025-06-01')] },
                allProps
            )).toBe(true);
        });

        it('is_after', () => {
            expect(evaluateFilterGroup(
                { date: '2025-06-01' },
                { combinator: 'and', conditions: [cond('date', 'is_after', '2025-01-01')] },
                allProps
            )).toBe(true);
        });
    });

    // ── Combinators ────────────────────────────────────────
    describe('AND / OR combinators', () => {
        it('AND: all must match', () => {
            const group: FilterGroup = {
                combinator: 'and',
                conditions: [cond('name', 'contains', 'hello'), cond('age', 'greater_than', 20)],
            };
            expect(evaluateFilterGroup({ name: 'hello world', age: 25 }, group, allProps)).toBe(true);
            expect(evaluateFilterGroup({ name: 'hello world', age: 15 }, group, allProps)).toBe(false);
        });

        it('OR: any can match', () => {
            const group: FilterGroup = {
                combinator: 'or',
                conditions: [cond('name', 'contains', 'hello'), cond('age', 'greater_than', 100)],
            };
            expect(evaluateFilterGroup({ name: 'hello', age: 5 }, group, allProps)).toBe(true);
            expect(evaluateFilterGroup({ name: 'world', age: 5 }, group, allProps)).toBe(false);
        });

        it('empty filter group passes everything', () => {
            expect(evaluateFilterGroup({ name: 'anything' }, { combinator: 'and', conditions: [] }, allProps)).toBe(true);
        });
    });
});
