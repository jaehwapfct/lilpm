/**
 * Formula Engine for Database Properties
 * 
 * Supported functions:
 *  - prop("Name") - reference a property value
 *  - Math: +, -, *, /, %, round(), floor(), ceil(), abs(), min(), max(), pow()
 *  - Text: concat(), length(), lower(), upper(), contains(), replace(), slice(), trim()
 *  - Logic: if(cond, then, else), and(), or(), not(), empty()
 *  - Comparison: ==, !=, >, <, >=, <=
 *  - Date: now(), formatDate(), dateBetween(), dateAdd(), dateSubtract()
 *  - Constants: true, false, pi(), e()
 */

import type { DatabaseProperty, DatabaseRow } from './databaseTypes';

// Token types
type TokenType = 'NUMBER' | 'STRING' | 'IDENT' | 'OP' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'BOOL' | 'EOF';

interface Token {
    type: TokenType;
    value: string | number | boolean;
}

// ── Tokenizer ──────────────────────────────────────────────
function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < input.length) {
        const ch = input[i];

        // Skip whitespace
        if (/\s/.test(ch)) { i++; continue; }

        // Numbers
        if (/\d/.test(ch) || (ch === '.' && i + 1 < input.length && /\d/.test(input[i + 1]))) {
            let num = '';
            while (i < input.length && (/\d/.test(input[i]) || input[i] === '.')) {
                num += input[i++];
            }
            tokens.push({ type: 'NUMBER', value: parseFloat(num) });
            continue;
        }

        // Strings (double or single quotes)
        if (ch === '"' || ch === "'") {
            const quote = ch;
            i++;
            let str = '';
            while (i < input.length && input[i] !== quote) {
                if (input[i] === '\\') { i++; }
                str += input[i++];
            }
            i++; // skip closing quote
            tokens.push({ type: 'STRING', value: str });
            continue;
        }

        // Operators (multi-char first)
        if (input.slice(i, i + 2) === '==' || input.slice(i, i + 2) === '!=' ||
            input.slice(i, i + 2) === '>=' || input.slice(i, i + 2) === '<=') {
            tokens.push({ type: 'OP', value: input.slice(i, i + 2) });
            i += 2;
            continue;
        }

        if ('+-*/%><!'.includes(ch)) {
            tokens.push({ type: 'OP', value: ch });
            i++;
            continue;
        }

        if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(' }); i++; continue; }
        if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')' }); i++; continue; }
        if (ch === ',') { tokens.push({ type: 'COMMA', value: ',' }); i++; continue; }

        // Identifiers / keywords
        if (/[a-zA-Z_]/.test(ch)) {
            let ident = '';
            while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
                ident += input[i++];
            }
            if (ident === 'true') tokens.push({ type: 'BOOL', value: true });
            else if (ident === 'false') tokens.push({ type: 'BOOL', value: false });
            else tokens.push({ type: 'IDENT', value: ident });
            continue;
        }

        // Unknown character, skip
        i++;
    }

    tokens.push({ type: 'EOF', value: '' });
    return tokens;
}

// ── Parser ─────────────────────────────────────────────────
class FormulaParser {
    private tokens: Token[];
    private pos: number;
    private row: DatabaseRow;
    private properties: DatabaseProperty[];
    private allRows?: DatabaseRow[];

    constructor(tokens: Token[], row: DatabaseRow, properties: DatabaseProperty[], allRows?: DatabaseRow[]) {
        this.tokens = tokens;
        this.pos = 0;
        this.row = row;
        this.properties = properties;
        this.allRows = allRows;
    }

    private peek(): Token { return this.tokens[this.pos] || { type: 'EOF', value: '' }; }
    private advance(): Token { return this.tokens[this.pos++]; }
    private expect(type: TokenType): Token {
        const t = this.advance();
        if (t.type !== type) throw new Error(`Expected ${type}, got ${t.type}`);
        return t;
    }

    parse(): unknown {
        const result = this.expression();
        return result;
    }

    private expression(): unknown {
        return this.ternary();
    }

    private ternary(): unknown {
        return this.or();
    }

    private or(): unknown {
        let left = this.and();
        while (this.peek().type === 'IDENT' && this.peek().value === 'or') {
            this.advance();
            this.expect('LPAREN');
            const right = this.expression();
            this.expect('RPAREN');
            left = Boolean(left) || Boolean(right);
        }
        return left;
    }

    private and(): unknown {
        let left = this.comparison();
        while (this.peek().type === 'IDENT' && this.peek().value === 'and') {
            this.advance();
            this.expect('LPAREN');
            const right = this.expression();
            this.expect('RPAREN');
            left = Boolean(left) && Boolean(right);
        }
        return left;
    }

    private comparison(): unknown {
        let left = this.addition();
        const op = this.peek();
        if (op.type === 'OP' && ['==', '!=', '>', '<', '>=', '<='].includes(op.value as string)) {
            this.advance();
            const right = this.addition();
            switch (op.value) {
                case '==': return left === right;
                case '!=': return left !== right;
                case '>': return (left as number) > (right as number);
                case '<': return (left as number) < (right as number);
                case '>=': return (left as number) >= (right as number);
                case '<=': return (left as number) <= (right as number);
            }
        }
        return left;
    }

    private addition(): unknown {
        let left = this.multiplication();
        while (this.peek().type === 'OP' && ['+', '-'].includes(this.peek().value as string)) {
            const op = this.advance();
            const right = this.multiplication();
            if (op.value === '+') {
                if (typeof left === 'string' || typeof right === 'string') {
                    left = String(left ?? '') + String(right ?? '');
                } else {
                    left = (left as number) + (right as number);
                }
            } else {
                left = (left as number) - (right as number);
            }
        }
        return left;
    }

    private multiplication(): unknown {
        let left = this.unary();
        while (this.peek().type === 'OP' && ['*', '/', '%'].includes(this.peek().value as string)) {
            const op = this.advance();
            const right = this.unary();
            if (op.value === '*') left = (left as number) * (right as number);
            else if (op.value === '/') left = (right as number) === 0 ? 0 : (left as number) / (right as number);
            else left = (left as number) % (right as number);
        }
        return left;
    }

    private unary(): unknown {
        if (this.peek().type === 'OP' && this.peek().value === '-') {
            this.advance();
            return -(this.primary() as number);
        }
        if (this.peek().type === 'OP' && this.peek().value === '!') {
            this.advance();
            return !this.primary();
        }
        return this.primary();
    }

    private primary(): unknown {
        const token = this.peek();

        // Number
        if (token.type === 'NUMBER') { this.advance(); return token.value; }
        // String
        if (token.type === 'STRING') { this.advance(); return token.value; }
        // Boolean
        if (token.type === 'BOOL') { this.advance(); return token.value; }

        // Function call or identifier
        if (token.type === 'IDENT') {
            return this.functionCall();
        }

        // Parenthesized expression
        if (token.type === 'LPAREN') {
            this.advance();
            const val = this.expression();
            this.expect('RPAREN');
            return val;
        }

        throw new Error(`Unexpected token: ${token.type} (${token.value})`);
    }

    private functionCall(): unknown {
        const name = this.advance().value as string;

        // If no paren follows, treat as identifier
        if (this.peek().type !== 'LPAREN') {
            return name;
        }

        this.expect('LPAREN');
        const args: unknown[] = [];

        if (this.peek().type !== 'RPAREN') {
            args.push(this.expression());
            while (this.peek().type === 'COMMA') {
                this.advance();
                args.push(this.expression());
            }
        }
        this.expect('RPAREN');

        return this.evaluateFunction(name.toLowerCase(), args);
    }

    private evaluateFunction(name: string, args: unknown[]): unknown {
        switch (name) {
            // Property reference
            case 'prop': {
                const propName = String(args[0]);
                const prop = this.properties.find(p => p.name === propName || p.id === propName);
                if (!prop) return null;
                return this.row.properties[prop.id] ?? null;
            }

            // Logic
            case 'if': return args[0] ? args[1] : args[2];
            case 'not': return !args[0];
            case 'empty': return args[0] === null || args[0] === undefined || args[0] === '' || (Array.isArray(args[0]) && args[0].length === 0);

            // Math
            case 'abs': return Math.abs(Number(args[0]));
            case 'round': return Math.round(Number(args[0]));
            case 'floor': return Math.floor(Number(args[0]));
            case 'ceil': return Math.ceil(Number(args[0]));
            case 'sqrt': return Math.sqrt(Number(args[0]));
            case 'pow': return Math.pow(Number(args[0]), Number(args[1]));
            case 'min': return Math.min(...args.map(Number));
            case 'max': return Math.max(...args.map(Number));
            case 'pi': return Math.PI;
            case 'e': return Math.E;
            case 'tonumber': return Number(args[0]) || 0;

            // Text
            case 'concat': return args.map(a => String(a ?? '')).join('');
            case 'length': return String(args[0] ?? '').length;
            case 'lower': return String(args[0] ?? '').toLowerCase();
            case 'upper': return String(args[0] ?? '').toUpperCase();
            case 'trim': return String(args[0] ?? '').trim();
            case 'contains': return String(args[0] ?? '').includes(String(args[1] ?? ''));
            case 'replace': return String(args[0] ?? '').replace(String(args[1] ?? ''), String(args[2] ?? ''));
            case 'slice': return String(args[0] ?? '').slice(Number(args[1]) || 0, args[2] != null ? Number(args[2]) : undefined);
            case 'test': return new RegExp(String(args[1] ?? '')).test(String(args[0] ?? ''));
            case 'tostring': return String(args[0] ?? '');

            // Date
            case 'now': return new Date().toISOString();
            case 'formatdate': {
                try {
                    const d = new Date(args[0] as string);
                    return d.toLocaleDateString();
                } catch { return String(args[0]); }
            }
            case 'datebetween': {
                try {
                    const d1 = new Date(args[0] as string).getTime();
                    const d2 = new Date(args[1] as string).getTime();
                    const unit = String(args[2] ?? 'days');
                    const diff = d1 - d2;
                    switch (unit) {
                        case 'days': return Math.floor(diff / 86400000);
                        case 'hours': return Math.floor(diff / 3600000);
                        case 'minutes': return Math.floor(diff / 60000);
                        case 'months': return Math.floor(diff / 2592000000);
                        case 'years': return Math.floor(diff / 31536000000);
                        default: return Math.floor(diff / 86400000);
                    }
                } catch { return 0; }
            }

            default:
                return null;
        }
    }
}

// ── Public API ─────────────────────────────────────────────
export function evaluateFormula(
    formula: string,
    row: DatabaseRow,
    properties: DatabaseProperty[],
    allRows?: DatabaseRow[],
): unknown {
    try {
        if (!formula || !formula.trim()) return null;
        const tokens = tokenize(formula);
        const parser = new FormulaParser(tokens, row, properties, allRows);
        return parser.parse();
    } catch (error) {
        return `#ERROR: ${(error as Error).message}`;
    }
}

// ── Formula Validation ─────────────────────────────────────
export function validateFormula(formula: string): { valid: boolean; error?: string } {
    try {
        if (!formula || !formula.trim()) return { valid: true };
        const tokens = tokenize(formula);
        // Basic validation: check balanced parens
        let depth = 0;
        for (const t of tokens) {
            if (t.type === 'LPAREN') depth++;
            if (t.type === 'RPAREN') depth--;
            if (depth < 0) return { valid: false, error: 'Unmatched closing parenthesis' };
        }
        if (depth !== 0) return { valid: false, error: 'Unmatched opening parenthesis' };
        return { valid: true };
    } catch (error) {
        return { valid: false, error: (error as Error).message };
    }
}

// ── Formula Suggestions ────────────────────────────────────
export const FORMULA_FUNCTIONS = [
    { name: 'prop', syntax: 'prop("Property Name")', desc: 'Get a property value' },
    { name: 'if', syntax: 'if(condition, then, else)', desc: 'Conditional logic' },
    { name: 'concat', syntax: 'concat(a, b, ...)', desc: 'Combine text values' },
    { name: 'length', syntax: 'length(text)', desc: 'Count characters' },
    { name: 'contains', syntax: 'contains(text, search)', desc: 'Check if text contains search' },
    { name: 'lower', syntax: 'lower(text)', desc: 'Convert to lowercase' },
    { name: 'upper', syntax: 'upper(text)', desc: 'Convert to uppercase' },
    { name: 'round', syntax: 'round(number)', desc: 'Round to nearest integer' },
    { name: 'abs', syntax: 'abs(number)', desc: 'Absolute value' },
    { name: 'min', syntax: 'min(a, b)', desc: 'Smallest value' },
    { name: 'max', syntax: 'max(a, b)', desc: 'Largest value' },
    { name: 'now', syntax: 'now()', desc: 'Current date/time' },
    { name: 'dateBetween', syntax: 'dateBetween(date1, date2, "days")', desc: 'Difference between dates' },
    { name: 'empty', syntax: 'empty(value)', desc: 'Check if value is empty' },
    { name: 'not', syntax: 'not(value)', desc: 'Negate a boolean' },
    { name: 'toNumber', syntax: 'toNumber(value)', desc: 'Convert to number' },
    { name: 'toString', syntax: 'toString(value)', desc: 'Convert to text' },
];
