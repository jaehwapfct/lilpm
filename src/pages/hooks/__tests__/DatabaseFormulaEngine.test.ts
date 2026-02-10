import { describe, it, expect } from 'vitest';
import { evaluateFormula, validateFormula } from '../DatabaseFormulaEngine';
import type { DatabaseProperty, DatabaseRow } from '../databaseTypes';

const makeRow = (props: Record<string, unknown>): DatabaseRow => ({
    id: 'row-1',
    properties: props,
    createdAt: '2025-01-01T00:00:00Z',
    createdBy: 'user-1',
    updatedAt: '2025-01-01T00:00:00Z',
    updatedBy: 'user-1',
});

const makeProps = (overrides: Partial<DatabaseProperty>[] = []): DatabaseProperty[] => [
    { id: 'name', name: 'Name', type: 'text' },
    { id: 'age', name: 'Age', type: 'number' },
    { id: 'score', name: 'Score', type: 'number' },
    { id: 'active', name: 'Active', type: 'checkbox' },
    { id: 'date', name: 'Date', type: 'date' },
    ...overrides,
];

describe('DatabaseFormulaEngine', () => {
    // ── Basic Math ─────────────────────────────────────────
    describe('math operations', () => {
        it('should add numbers', () => {
            expect(evaluateFormula('1 + 2', makeRow({}), [])).toBe(3);
        });

        it('should subtract', () => {
            expect(evaluateFormula('10 - 3', makeRow({}), [])).toBe(7);
        });

        it('should multiply', () => {
            expect(evaluateFormula('4 * 5', makeRow({}), [])).toBe(20);
        });

        it('should divide', () => {
            expect(evaluateFormula('20 / 4', makeRow({}), [])).toBe(5);
        });

        it('should handle division by zero', () => {
            expect(evaluateFormula('10 / 0', makeRow({}), [])).toBe(0);
        });

        it('should handle modulo', () => {
            expect(evaluateFormula('10 % 3', makeRow({}), [])).toBe(1);
        });

        it('should respect operator precedence', () => {
            expect(evaluateFormula('2 + 3 * 4', makeRow({}), [])).toBe(14);
        });

        it('should handle parentheses', () => {
            expect(evaluateFormula('(2 + 3) * 4', makeRow({}), [])).toBe(20);
        });

        it('should handle negative numbers', () => {
            expect(evaluateFormula('-5 + 3', makeRow({}), [])).toBe(-2);
        });

        it('should handle decimals', () => {
            expect(evaluateFormula('1.5 + 2.5', makeRow({}), [])).toBe(4);
        });
    });

    // ── Comparison ─────────────────────────────────────────
    describe('comparison operators', () => {
        it('== equal', () => {
            expect(evaluateFormula('5 == 5', makeRow({}), [])).toBe(true);
        });

        it('!= not equal', () => {
            expect(evaluateFormula('5 != 3', makeRow({}), [])).toBe(true);
        });

        it('> greater', () => {
            expect(evaluateFormula('5 > 3', makeRow({}), [])).toBe(true);
            expect(evaluateFormula('3 > 5', makeRow({}), [])).toBe(false);
        });

        it('< less', () => {
            expect(evaluateFormula('3 < 5', makeRow({}), [])).toBe(true);
        });

        it('>= >=', () => {
            expect(evaluateFormula('5 >= 5', makeRow({}), [])).toBe(true);
            expect(evaluateFormula('4 >= 5', makeRow({}), [])).toBe(false);
        });

        it('<= <=', () => {
            expect(evaluateFormula('5 <= 5', makeRow({}), [])).toBe(true);
        });
    });

    // ── Strings ────────────────────────────────────────────
    describe('string operations', () => {
        it('should concatenate with +', () => {
            expect(evaluateFormula('"hello" + " " + "world"', makeRow({}), [])).toBe('hello world');
        });

        it('concat()', () => {
            expect(evaluateFormula('concat("a", "b", "c")', makeRow({}), [])).toBe('abc');
        });

        it('length()', () => {
            expect(evaluateFormula('length("hello")', makeRow({}), [])).toBe(5);
        });

        it('lower()', () => {
            expect(evaluateFormula('lower("HELLO")', makeRow({}), [])).toBe('hello');
        });

        it('upper()', () => {
            expect(evaluateFormula('upper("hello")', makeRow({}), [])).toBe('HELLO');
        });

        it('contains()', () => {
            expect(evaluateFormula('contains("hello world", "world")', makeRow({}), [])).toBe(true);
            expect(evaluateFormula('contains("hello", "xyz")', makeRow({}), [])).toBe(false);
        });

        it('replace()', () => {
            expect(evaluateFormula('replace("hello world", "world", "earth")', makeRow({}), [])).toBe('hello earth');
        });

        it('slice()', () => {
            expect(evaluateFormula('slice("hello", 0, 3)', makeRow({}), [])).toBe('hel');
        });

        it('trim()', () => {
            expect(evaluateFormula('trim("  hello  ")', makeRow({}), [])).toBe('hello');
        });
    });

    // ── Logic ──────────────────────────────────────────────
    describe('logic functions', () => {
        it('if() true branch', () => {
            expect(evaluateFormula('if(true, "yes", "no")', makeRow({}), [])).toBe('yes');
        });

        it('if() false branch', () => {
            expect(evaluateFormula('if(false, "yes", "no")', makeRow({}), [])).toBe('no');
        });

        it('if() with comparison', () => {
            expect(evaluateFormula('if(5 > 3, "big", "small")', makeRow({}), [])).toBe('big');
        });

        it('not()', () => {
            expect(evaluateFormula('not(true)', makeRow({}), [])).toBe(false);
            expect(evaluateFormula('not(false)', makeRow({}), [])).toBe(true);
        });

        it('empty()', () => {
            expect(evaluateFormula('empty("")', makeRow({}), [])).toBe(true);
            expect(evaluateFormula('empty("text")', makeRow({}), [])).toBe(false);
        });
    });

    // ── Math Functions ─────────────────────────────────────
    describe('math functions', () => {
        it('abs()', () => {
            expect(evaluateFormula('abs(-5)', makeRow({}), [])).toBe(5);
        });

        it('round()', () => {
            expect(evaluateFormula('round(3.7)', makeRow({}), [])).toBe(4);
        });

        it('floor()', () => {
            expect(evaluateFormula('floor(3.9)', makeRow({}), [])).toBe(3);
        });

        it('ceil()', () => {
            expect(evaluateFormula('ceil(3.1)', makeRow({}), [])).toBe(4);
        });

        it('min()', () => {
            expect(evaluateFormula('min(3, 1, 5)', makeRow({}), [])).toBe(1);
        });

        it('max()', () => {
            expect(evaluateFormula('max(3, 1, 5)', makeRow({}), [])).toBe(5);
        });

        it('pow()', () => {
            expect(evaluateFormula('pow(2, 3)', makeRow({}), [])).toBe(8);
        });

        it('sqrt()', () => {
            expect(evaluateFormula('sqrt(9)', makeRow({}), [])).toBe(3);
        });

        it('pi()', () => {
            expect(evaluateFormula('pi()', makeRow({}), [])).toBeCloseTo(Math.PI);
        });
    });

    // ── Property References ────────────────────────────────
    describe('prop() references', () => {
        it('should get text property', () => {
            const row = makeRow({ name: 'Alice' });
            const props = makeProps();
            expect(evaluateFormula('prop("Name")', row, props)).toBe('Alice');
        });

        it('should get number property', () => {
            const row = makeRow({ age: 25 });
            const props = makeProps();
            expect(evaluateFormula('prop("Age")', row, props)).toBe(25);
        });

        it('should compute with properties', () => {
            const row = makeRow({ age: 25, score: 90 });
            const props = makeProps();
            expect(evaluateFormula('prop("Age") + prop("Score")', row, props)).toBe(115);
        });

        it('should return null for missing property', () => {
            const row = makeRow({});
            const props = makeProps();
            expect(evaluateFormula('prop("Nonexistent")', row, props)).toBe(null);
        });

        it('should work in if condition', () => {
            const row = makeRow({ score: 90 });
            const props = makeProps();
            expect(evaluateFormula('if(prop("Score") > 80, "Pass", "Fail")', row, props)).toBe('Pass');
        });
    });

    // ── Error Handling ─────────────────────────────────────
    describe('error handling', () => {
        it('should return null for empty formula', () => {
            expect(evaluateFormula('', makeRow({}), [])).toBe(null);
        });

        it('should return error string for invalid formula', () => {
            const result = evaluateFormula('((())', makeRow({}), []);
            expect(String(result)).toContain('#ERROR');
        });

        it('should handle deeply nested operations', () => {
            expect(evaluateFormula('round(abs(-3.7) + ceil(2.1))', makeRow({}), [])).toBe(7);
        });
    });

    // ── Validation ─────────────────────────────────────────
    describe('validateFormula', () => {
        it('should pass valid formula', () => {
            expect(validateFormula('1 + 2')).toEqual({ valid: true });
        });

        it('should pass empty formula', () => {
            expect(validateFormula('')).toEqual({ valid: true });
        });

        it('should fail on unmatched paren', () => {
            const result = validateFormula('((1 + 2)');
            expect(result.valid).toBe(false);
        });
    });
});
