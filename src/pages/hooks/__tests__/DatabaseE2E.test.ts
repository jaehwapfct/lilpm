/**
 * Database E2E Scenario Tests
 * Tests complete user workflows through the database system.
 * These test the integration between multiple modules.
 */

import { describe, it, expect } from 'vitest';
import { evaluateFormula } from '../DatabaseFormulaEngine';
import { evaluateFilterGroup } from '../DatabaseFilterBuilder';
import type { DatabaseProperty, DatabaseRow, FilterGroup } from '../databaseTypes';

// ── Test Data Factory ──────────────────────────────────────
function createTaskDatabase() {
    const properties: DatabaseProperty[] = [
        { id: 'title', name: 'Title', type: 'text' },
        {
            id: 'status', name: 'Status', type: 'select', options: [
                { id: 'todo', name: 'To Do', color: '#ef4444' },
                { id: 'progress', name: 'In Progress', color: '#f97316' },
                { id: 'done', name: 'Done', color: '#22c55e' },
            ]
        },
        {
            id: 'priority', name: 'Priority', type: 'select', options: [
                { id: 'high', name: 'High', color: '#ef4444' },
                { id: 'medium', name: 'Medium', color: '#f97316' },
                { id: 'low', name: 'Low', color: '#22c55e' },
            ]
        },
        { id: 'assignee', name: 'Assignee', type: 'person' },
        { id: 'dueDate', name: 'Due Date', type: 'date' },
        { id: 'estimate', name: 'Estimate (hrs)', type: 'number' },
        { id: 'done', name: 'Completed', type: 'checkbox' },
        { id: 'totalWork', name: 'Total Work', type: 'formula', formula: 'prop("Estimate (hrs)") * 1.5' },
        { id: 'isOverdue', name: 'Is Overdue', type: 'formula', formula: 'if(prop("Completed") == false, "⚠️ Check", "✅ Done")' },
    ];

    const rows: DatabaseRow[] = [
        {
            id: 'r1', properties: {
                title: 'Design homepage', status: 'done', priority: 'high',
                assignee: 'Alice', dueDate: '2025-01-15', estimate: 8, done: true,
            },
            createdAt: '2025-01-01T00:00:00Z', createdBy: 'u1', updatedAt: '2025-01-15T00:00:00Z', updatedBy: 'u1',
        },
        {
            id: 'r2', properties: {
                title: 'Implement auth', status: 'progress', priority: 'high',
                assignee: 'Bob', dueDate: '2025-02-01', estimate: 16, done: false,
            },
            createdAt: '2025-01-05T00:00:00Z', createdBy: 'u1', updatedAt: '2025-01-20T00:00:00Z', updatedBy: 'u2',
        },
        {
            id: 'r3', properties: {
                title: 'Write tests', status: 'todo', priority: 'medium',
                assignee: 'Alice', dueDate: '2025-02-15', estimate: 12, done: false,
            },
            createdAt: '2025-01-10T00:00:00Z', createdBy: 'u2', updatedAt: '2025-01-10T00:00:00Z', updatedBy: 'u2',
        },
        {
            id: 'r4', properties: {
                title: 'Deploy to production', status: 'todo', priority: 'low',
                assignee: 'Bob', dueDate: '2025-03-01', estimate: 4, done: false,
            },
            createdAt: '2025-01-12T00:00:00Z', createdBy: 'u1', updatedAt: '2025-01-12T00:00:00Z', updatedBy: 'u1',
        },
        {
            id: 'r5', properties: {
                title: 'Code review', status: 'progress', priority: 'medium',
                assignee: null, dueDate: null, estimate: null, done: false,
            },
            createdAt: '2025-01-15T00:00:00Z', createdBy: 'u2', updatedAt: '2025-01-15T00:00:00Z', updatedBy: 'u2',
        },
    ];

    return { properties, rows };
}

describe('E2E: Task Database Scenarios', () => {
    const { properties, rows } = createTaskDatabase();

    // ── Scenario 1: Filter to find high priority incomplete tasks ──
    describe('Scenario: Find high priority incomplete tasks', () => {
        it('should filter by priority=high AND done=false', () => {
            const filter: FilterGroup = {
                combinator: 'and',
                conditions: [
                    { id: '1', propertyId: 'priority', operator: 'equals', value: 'high' },
                    { id: '2', propertyId: 'done', operator: 'equals', value: false },
                ],
            };

            const results = rows.filter(r => evaluateFilterGroup(r.properties, filter, properties));
            expect(results).toHaveLength(1);
            expect(results[0].properties.title).toBe('Implement auth');
        });
    });

    // ── Scenario 2: Filter unassigned tasks ────────────────
    describe('Scenario: Find unassigned tasks', () => {
        it('should find tasks with empty assignee', () => {
            const filter: FilterGroup = {
                combinator: 'and',
                conditions: [
                    { id: '1', propertyId: 'assignee', operator: 'is_empty', value: null },
                ],
            };

            const results = rows.filter(r => evaluateFilterGroup(r.properties, filter, properties));
            expect(results).toHaveLength(1);
            expect(results[0].properties.title).toBe('Code review');
        });
    });

    // ── Scenario 3: OR filter - overdue OR high priority ───
    describe('Scenario: Find overdue OR high priority items', () => {
        it('should find items matching either condition', () => {
            const filter: FilterGroup = {
                combinator: 'or',
                conditions: [
                    { id: '1', propertyId: 'priority', operator: 'equals', value: 'high' },
                    { id: '2', propertyId: 'dueDate', operator: 'is_before', value: '2025-01-20T00:00:00Z' },
                ],
            };

            const results = rows.filter(r => evaluateFilterGroup(r.properties, filter, properties));
            // high priority: Design homepage, Implement auth
            // before Jan 20: Design homepage
            // unique: Design homepage, Implement auth
            expect(results.length).toBeGreaterThanOrEqual(2);
        });
    });

    // ── Scenario 4: Formula evaluation across rows ─────────
    describe('Scenario: Formula computed properties', () => {
        it('should calculate Total Work (estimate * 1.5)', () => {
            const formulaProp = properties.find(p => p.id === 'totalWork')!;
            const result = evaluateFormula(formulaProp.formula!, rows[0], properties);
            expect(result).toBe(12); // 8 * 1.5
        });

        it('should calculate Total Work for different row', () => {
            const formulaProp = properties.find(p => p.id === 'totalWork')!;
            const result = evaluateFormula(formulaProp.formula!, rows[1], properties);
            expect(result).toBe(24); // 16 * 1.5
        });

        it('should handle conditional formula', () => {
            const formulaProp = properties.find(p => p.id === 'isOverdue')!;

            // Completed task
            const doneResult = evaluateFormula(formulaProp.formula!, rows[0], properties);
            expect(doneResult).toBe('✅ Done');

            // Incomplete task
            const notDoneResult = evaluateFormula(formulaProp.formula!, rows[1], properties);
            expect(notDoneResult).toBe('⚠️ Check');
        });

        it('should handle null estimate gracefully', () => {
            const formulaProp = properties.find(p => p.id === 'totalWork')!;
            const result = evaluateFormula(formulaProp.formula!, rows[4], properties); // estimate is null
            expect(result).toBe(0); // null * 1.5 = NaN → treated as 0
        });
    });

    // ── Scenario 5: Complex filter + sort pipeline ─────────
    describe('Scenario: Filtered and sorted view', () => {
        it('should filter in-progress items and sort by estimate desc', () => {
            const filter: FilterGroup = {
                combinator: 'and',
                conditions: [
                    { id: '1', propertyId: 'status', operator: 'equals', value: 'progress' },
                ],
            };

            const filtered = rows.filter(r => evaluateFilterGroup(r.properties, filter, properties));
            expect(filtered).toHaveLength(2);

            // Sort by estimate descending
            const sorted = [...filtered].sort((a, b) => {
                const aEst = (a.properties.estimate as number) || 0;
                const bEst = (b.properties.estimate as number) || 0;
                return bEst - aEst;
            });

            expect(sorted[0].properties.title).toBe('Implement auth'); // 16
            expect(sorted[1].properties.title).toBe('Code review');    // null → 0
        });
    });

    // ── Scenario 6: Search within filtered data ────────────
    describe('Scenario: Search within filters', () => {
        it('should search text within todo items', () => {
            const filter: FilterGroup = {
                combinator: 'and',
                conditions: [
                    { id: '1', propertyId: 'status', operator: 'equals', value: 'todo' },
                ],
            };

            const filtered = rows.filter(r => evaluateFilterGroup(r.properties, filter, properties));
            expect(filtered).toHaveLength(2); // Write tests, Deploy

            // Then search for "deploy"
            const searched = filtered.filter(r =>
                String(r.properties.title).toLowerCase().includes('deploy')
            );
            expect(searched).toHaveLength(1);
            expect(searched[0].properties.title).toBe('Deploy to production');
        });
    });

    // ── Scenario 7: Group by status and count ──────────────
    describe('Scenario: Group by status', () => {
        it('should correctly group rows by status', () => {
            const groups = new Map<string, DatabaseRow[]>();
            rows.forEach(row => {
                const status = row.properties.status as string || 'none';
                const existing = groups.get(status) || [];
                groups.set(status, [...existing, row]);
            });

            expect(groups.get('done')?.length).toBe(1);
            expect(groups.get('progress')?.length).toBe(2);
            expect(groups.get('todo')?.length).toBe(2);
        });
    });

    // ── Scenario 8: Aggregation calculations ───────────────
    describe('Scenario: Summary row calculations', () => {
        it('should calculate total estimate (sum)', () => {
            const total = rows.reduce((sum, r) => sum + (Number(r.properties.estimate) || 0), 0);
            expect(total).toBe(40); // 8 + 16 + 12 + 4 + 0
        });

        it('should calculate average estimate', () => {
            const nonNull = rows.filter(r => r.properties.estimate != null);
            const avg = nonNull.reduce((sum, r) => sum + Number(r.properties.estimate), 0) / nonNull.length;
            expect(avg).toBe(10); // 40 / 4
        });

        it('should count completed', () => {
            const completed = rows.filter(r => r.properties.done === true).length;
            expect(completed).toBe(1);
        });

        it('should calculate percent completed', () => {
            const total = rows.length;
            const completed = rows.filter(r => r.properties.done === true).length;
            expect(Math.round((completed / total) * 100)).toBe(20);
        });
    });
});
