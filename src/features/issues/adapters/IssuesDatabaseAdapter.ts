/**
 * IssuesDatabaseAdapter
 * Maps Issue fields to DatabaseProperty/DatabaseRow format
 * so that all database views (Chart, Timeline, Calendar, Gallery, etc.)
 * can be used with issues data.
 */

import type { Issue, IssueStatus, IssuePriority, IssueType, Label, User } from '@/types';
import type { DatabaseProperty, DatabaseRow, Database } from '@/pages/hooks/databaseTypes';

// ── Status / Priority / Type option mappings ───────────────
const STATUS_OPTIONS = [
    { id: 'backlog', name: 'Backlog', color: '#64748b' },
    { id: 'todo', name: 'Todo', color: '#6b7280' },
    { id: 'in_progress', name: 'In Progress', color: '#3b82f6' },
    { id: 'in_review', name: 'In Review', color: '#8b5cf6' },
    { id: 'blocked', name: 'Blocked', color: '#ef4444' },
    { id: 'done', name: 'Done', color: '#22c55e' },
    { id: 'cancelled', name: 'Cancelled', color: '#9ca3af' },
];

const PRIORITY_OPTIONS = [
    { id: 'urgent', name: 'Urgent', color: '#ef4444' },
    { id: 'high', name: 'High', color: '#f97316' },
    { id: 'medium', name: 'Medium', color: '#eab308' },
    { id: 'low', name: 'Low', color: '#22c55e' },
    { id: 'none', name: 'None', color: '#64748b' },
];

const TYPE_OPTIONS = [
    { id: 'epic', name: 'Epic', color: '#8b5cf6' },
    { id: 'user_story', name: 'User Story', color: '#3b82f6' },
    { id: 'task', name: 'Task', color: '#22c55e' },
    { id: 'subtask', name: 'Subtask', color: '#06b6d4' },
    { id: 'bug', name: 'Bug', color: '#ef4444' },
];

// ── Property definitions (Issue fields → DatabaseProperties) ──
export const ISSUE_PROPERTIES: DatabaseProperty[] = [
    { id: '_identifier', name: 'ID', type: 'text' },
    { id: '_title', name: 'Title', type: 'text' },
    { id: '_status', name: 'Status', type: 'select', options: STATUS_OPTIONS },
    { id: '_priority', name: 'Priority', type: 'select', options: PRIORITY_OPTIONS },
    { id: '_type', name: 'Type', type: 'select', options: TYPE_OPTIONS },
    { id: '_assignee', name: 'Assignee', type: 'person' },
    { id: '_project', name: 'Project', type: 'text' },
    { id: '_dueDate', name: 'Due Date', type: 'date' },
    { id: '_estimate', name: 'Estimate', type: 'number' },
    { id: '_createdAt', name: 'Created', type: 'created_time' },
    { id: '_updatedAt', name: 'Updated', type: 'last_edited_time' },
];

// ── Issue → DatabaseRow conversion ─────────────────────────
export function issueToDatabaseRow(issue: Issue): DatabaseRow {
    return {
        id: issue.id,
        properties: {
            _identifier: issue.identifier,
            _title: issue.title,
            _status: issue.status,
            _priority: issue.priority,
            _type: issue.type,
            _assignee: issue.assigneeId || null,
            _project: issue.project?.name || null,
            _dueDate: issue.dueDate || null,
            _estimate: issue.estimate || null,
            _createdAt: issue.createdAt,
            _updatedAt: issue.updatedAt,
        },
        createdAt: issue.createdAt,
        createdBy: issue.creatorId,
        updatedAt: issue.updatedAt,
        updatedBy: issue.creatorId,
        parentId: issue.parentId || null,
    };
}

// ── DatabaseRow changes → Issue update ─────────────────────
export function databaseRowToIssueUpdate(
    propertyId: string,
    value: unknown,
): Partial<Issue> | null {
    switch (propertyId) {
        case '_title': return { title: value as string };
        case '_status': return { status: value as IssueStatus };
        case '_priority': return { priority: value as IssuePriority };
        case '_type': return { type: value as IssueType };
        case '_assignee': return { assigneeId: (value as string) || undefined };
        case '_dueDate': return { dueDate: (value as string) || undefined };
        case '_estimate': return { estimate: value as number };
        default: return null; // Read-only fields
    }
}

// ── Issues array → Virtual Database ────────────────────────
export function issuesToVirtualDatabase(
    issues: Issue[],
    teamId: string,
): Database {
    return {
        id: `virtual-issues-${teamId}`,
        name: 'Issues',
        description: 'Issue tracker data as a database view',
        icon: '🎯',
        teamId,
        createdAt: new Date().toISOString(),
        properties: ISSUE_PROPERTIES,
        rows: issues.map(issueToDatabaseRow),
        views: [
            { id: 'v-table', name: 'Table', type: 'table' },
            { id: 'v-board', name: 'Board', type: 'board' },
            { id: 'v-calendar', name: 'Calendar', type: 'calendar' },
            { id: 'v-timeline', name: 'Timeline', type: 'timeline' },
            { id: 'v-gallery', name: 'Gallery', type: 'gallery' },
            { id: 'v-chart', name: 'Chart', type: 'chart' },
        ],
    };
}

// ── Read-only property check ───────────────────────────────
export function isReadOnlyProperty(propertyId: string): boolean {
    return ['_identifier', '_project', '_createdAt', '_updatedAt'].includes(propertyId);
}
