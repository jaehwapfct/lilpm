import React from 'react';
import {
    Hash, Type, CalendarIcon, User, Link, CheckSquare,
    Percent, ArrowUpDown, Clock, Mail, Phone, Tag, FileText,
    MousePointerClick, ListOrdered
} from 'lucide-react';

// Database property types (Notion-style)
export type PropertyType =
    | 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'person'
    | 'checkbox' | 'url' | 'email' | 'phone' | 'formula' | 'relation'
    | 'rollup' | 'created_time' | 'created_by' | 'last_edited_time'
    | 'last_edited_by' | 'files' | 'status' | 'button' | 'auto_id';

export interface ButtonAction {
    type: 'edit_property' | 'open_page' | 'add_page';
    propertyId?: string;
    value?: unknown;
    databaseId?: string;
}

export interface ConditionalFormat {
    id: string;
    propertyId: string;
    operator: string;
    value: unknown;
    color: string;        // background color
    textColor?: string;   // text color
}

export interface DatabaseProperty {
    id: string;
    name: string;
    type: PropertyType;
    options?: { id: string; name: string; color: string }[];
    formula?: string;
    relationDatabaseId?: string;
    rollupProperty?: string;
    rollupRelationId?: string;
    rollupAggregation?: string;
    buttonActions?: ButtonAction[];
}

export interface DatabaseRow {
    id: string;
    properties: Record<string, unknown>;
    createdAt: string;
    createdBy: string;
    updatedAt: string;
    updatedBy: string;
    parentId?: string | null;
    position?: number;
}

export interface Database {
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

export interface DatabaseView {
    id: string;
    name: string;
    type: 'table' | 'board' | 'calendar' | 'list' | 'gallery' | 'timeline' | 'chart' | 'form';
    filters?: unknown[];
    sorts?: unknown[];
    groupBy?: string;
    visibleProperties?: string[];
    chartConfig?: { type: 'bar' | 'line' | 'donut'; xAxis?: string; yAxis?: string };
    conditionalFormats?: ConditionalFormat[];
}

export const PROPERTY_ICONS: Record<PropertyType, React.ElementType> = {
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
    button: MousePointerClick,
    auto_id: ListOrdered,
};

export const PROPERTY_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#06b6d4',
];

// ── Filter Types ───────────────────────────────────────────
export type FilterOperator =
    | 'equals' | 'not_equals'
    | 'contains' | 'not_contains'
    | 'starts_with' | 'ends_with'
    | 'is_empty' | 'is_not_empty'
    | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal'
    | 'is_before' | 'is_after';

export interface FilterCondition {
    id: string;
    propertyId: string;
    operator: FilterOperator;
    value: unknown;
}

export interface FilterGroup {
    combinator: 'and' | 'or';
    conditions: FilterCondition[];
}

export const OPERATORS_BY_TYPE: Record<string, { value: FilterOperator; label: string }[]> = {
    text: [
        { value: 'contains', label: 'Contains' },
        { value: 'not_contains', label: 'Does not contain' },
        { value: 'equals', label: 'Is' },
        { value: 'not_equals', label: 'Is not' },
        { value: 'starts_with', label: 'Starts with' },
        { value: 'ends_with', label: 'Ends with' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
    ],
    number: [
        { value: 'equals', label: '=' },
        { value: 'not_equals', label: '≠' },
        { value: 'greater_than', label: '>' },
        { value: 'less_than', label: '<' },
        { value: 'greater_equal', label: '≥' },
        { value: 'less_equal', label: '≤' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
    ],
    select: [
        { value: 'equals', label: 'Is' },
        { value: 'not_equals', label: 'Is not' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
    ],
    multi_select: [
        { value: 'contains', label: 'Contains' },
        { value: 'not_contains', label: 'Does not contain' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
    ],
    date: [
        { value: 'equals', label: 'Is' },
        { value: 'is_before', label: 'Is before' },
        { value: 'is_after', label: 'Is after' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
    ],
    checkbox: [
        { value: 'equals', label: 'Is' },
    ],
};

// Map aliases to canonical operator lists
OPERATORS_BY_TYPE['email'] = OPERATORS_BY_TYPE['text'];
OPERATORS_BY_TYPE['phone'] = OPERATORS_BY_TYPE['text'];
OPERATORS_BY_TYPE['url'] = OPERATORS_BY_TYPE['text'];
OPERATORS_BY_TYPE['status'] = OPERATORS_BY_TYPE['select'];
OPERATORS_BY_TYPE['person'] = OPERATORS_BY_TYPE['select'];
OPERATORS_BY_TYPE['created_time'] = OPERATORS_BY_TYPE['date'];
OPERATORS_BY_TYPE['last_edited_time'] = OPERATORS_BY_TYPE['date'];

// ── Sort Types ─────────────────────────────────────────────
export interface SortCondition {
    id: string;
    propertyId: string;
    direction: 'asc' | 'desc';
}
