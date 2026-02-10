import { describe, it, expect } from 'vitest';
import {
    issueToDatabaseRow,
    databaseRowToIssueUpdate,
    issuesToVirtualDatabase,
    isReadOnlyProperty,
    ISSUE_PROPERTIES,
} from '../IssuesDatabaseAdapter';
import type { Issue } from '@/types';

const mockIssue: Issue = {
    id: 'issue-1',
    identifier: 'LPM-123',
    title: 'Fix login bug',
    type: 'bug',
    status: 'in_progress',
    priority: 'high',
    teamId: 'team-1',
    creatorId: 'user-1',
    assigneeId: 'user-2',
    labels: [],
    sortOrder: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
    dueDate: '2025-02-01',
    estimate: 5,
};

describe('IssuesDatabaseAdapter', () => {
    describe('ISSUE_PROPERTIES', () => {
        it('should have 11 properties defined', () => {
            expect(ISSUE_PROPERTIES).toHaveLength(11);
        });

        it('should have correct property types', () => {
            const statusProp = ISSUE_PROPERTIES.find(p => p.id === '_status');
            expect(statusProp?.type).toBe('select');
            expect(statusProp?.options).toHaveLength(7);

            const dueDateProp = ISSUE_PROPERTIES.find(p => p.id === '_dueDate');
            expect(dueDateProp?.type).toBe('date');

            const estimateProp = ISSUE_PROPERTIES.find(p => p.id === '_estimate');
            expect(estimateProp?.type).toBe('number');
        });
    });

    describe('issueToDatabaseRow', () => {
        it('should convert issue to database row', () => {
            const row = issueToDatabaseRow(mockIssue);

            expect(row.id).toBe('issue-1');
            expect(row.properties._identifier).toBe('LPM-123');
            expect(row.properties._title).toBe('Fix login bug');
            expect(row.properties._status).toBe('in_progress');
            expect(row.properties._priority).toBe('high');
            expect(row.properties._type).toBe('bug');
            expect(row.properties._assignee).toBe('user-2');
            expect(row.properties._dueDate).toBe('2025-02-01');
            expect(row.properties._estimate).toBe(5);
        });

        it('should handle null optional fields', () => {
            const issue: Issue = {
                ...mockIssue,
                assigneeId: undefined,
                dueDate: undefined,
                estimate: undefined,
            };
            const row = issueToDatabaseRow(issue);

            expect(row.properties._assignee).toBe(null);
            expect(row.properties._dueDate).toBe(null);
            expect(row.properties._estimate).toBe(null);
        });

        it('should preserve timestamps', () => {
            const row = issueToDatabaseRow(mockIssue);
            expect(row.createdAt).toBe('2025-01-01T00:00:00Z');
            expect(row.updatedAt).toBe('2025-01-15T00:00:00Z');
        });
    });

    describe('databaseRowToIssueUpdate', () => {
        it('should map _title to title', () => {
            const update = databaseRowToIssueUpdate('_title', 'New Title');
            expect(update).toEqual({ title: 'New Title' });
        });

        it('should map _status to status', () => {
            const update = databaseRowToIssueUpdate('_status', 'done');
            expect(update).toEqual({ status: 'done' });
        });

        it('should map _priority to priority', () => {
            const update = databaseRowToIssueUpdate('_priority', 'urgent');
            expect(update).toEqual({ priority: 'urgent' });
        });

        it('should map _assignee to assigneeId', () => {
            const update = databaseRowToIssueUpdate('_assignee', 'user-3');
            expect(update).toEqual({ assigneeId: 'user-3' });
        });

        it('should map _dueDate to dueDate', () => {
            const update = databaseRowToIssueUpdate('_dueDate', '2025-03-01');
            expect(update).toEqual({ dueDate: '2025-03-01' });
        });

        it('should map _estimate to estimate', () => {
            const update = databaseRowToIssueUpdate('_estimate', 8);
            expect(update).toEqual({ estimate: 8 });
        });

        it('should return null for read-only fields', () => {
            expect(databaseRowToIssueUpdate('_identifier', 'LPM-999')).toBe(null);
            expect(databaseRowToIssueUpdate('_createdAt', '2025-01-01')).toBe(null);
            expect(databaseRowToIssueUpdate('_updatedAt', '2025-01-01')).toBe(null);
            expect(databaseRowToIssueUpdate('_project', 'Project')).toBe(null);
        });
    });

    describe('issuesToVirtualDatabase', () => {
        it('should create a virtual database from issues', () => {
            const db = issuesToVirtualDatabase([mockIssue], 'team-1');

            expect(db.id).toBe('virtual-issues-team-1');
            expect(db.name).toBe('Issues');
            expect(db.properties).toEqual(ISSUE_PROPERTIES);
            expect(db.rows).toHaveLength(1);
            expect(db.views).toHaveLength(6);
        });

        it('should handle empty issues array', () => {
            const db = issuesToVirtualDatabase([], 'team-1');
            expect(db.rows).toHaveLength(0);
        });

        it('should convert all issues to rows', () => {
            const issues = [
                mockIssue,
                { ...mockIssue, id: 'issue-2', identifier: 'LPM-124', title: 'Feature request' },
            ];
            const db = issuesToVirtualDatabase(issues, 'team-1');
            expect(db.rows).toHaveLength(2);
        });
    });

    describe('isReadOnlyProperty', () => {
        it('should mark _identifier as read-only', () => {
            expect(isReadOnlyProperty('_identifier')).toBe(true);
        });

        it('should mark _project as read-only', () => {
            expect(isReadOnlyProperty('_project')).toBe(true);
        });

        it('should mark timestamps as read-only', () => {
            expect(isReadOnlyProperty('_createdAt')).toBe(true);
            expect(isReadOnlyProperty('_updatedAt')).toBe(true);
        });

        it('should not mark editable fields as read-only', () => {
            expect(isReadOnlyProperty('_title')).toBe(false);
            expect(isReadOnlyProperty('_status')).toBe(false);
            expect(isReadOnlyProperty('_priority')).toBe(false);
        });
    });
});
