import { describe, it, expect } from 'vitest';

// Extract CSV parsing logic for testing (same as in DatabaseCSVHandler.tsx)
function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let current: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (ch === '"' && next === '"') {
                cell += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                cell += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',' || ch === '\t') {
                current.push(cell);
                cell = '';
            } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
                current.push(cell);
                cell = '';
                rows.push(current);
                current = [];
                if (ch === '\r') i++;
            } else {
                cell += ch;
            }
        }
    }

    if (cell || current.length > 0) {
        current.push(cell);
        rows.push(current);
    }

    return rows;
}

function escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

describe('CSV Parser', () => {
    it('should parse simple CSV', () => {
        const result = parseCSV('a,b,c\n1,2,3');
        expect(result).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    });

    it('should handle quoted fields', () => {
        const result = parseCSV('"hello, world",b,c');
        expect(result[0][0]).toBe('hello, world');
    });

    it('should handle escaped quotes', () => {
        const result = parseCSV('"He said ""hi""",b');
        expect(result[0][0]).toBe('He said "hi"');
    });

    it('should handle newlines in quoted fields', () => {
        const result = parseCSV('"line1\nline2",b');
        expect(result[0][0]).toBe('line1\nline2');
    });

    it('should handle empty fields', () => {
        const result = parseCSV('a,,c');
        expect(result[0]).toEqual(['a', '', 'c']);
    });

    it('should handle Windows line endings (\\r\\n)', () => {
        const result = parseCSV('a,b\r\nc,d');
        expect(result).toEqual([['a', 'b'], ['c', 'd']]);
    });

    it('should handle TSV (tab separated)', () => {
        const result = parseCSV('a\tb\tc');
        expect(result[0]).toEqual(['a', 'b', 'c']);
    });

    it('should handle trailing newline', () => {
        const result = parseCSV('a,b\nc,d\n');
        // Parser correctly strips trailing newline, no empty row
        expect(result).toEqual([['a', 'b'], ['c', 'd']]);
    });

    it('should handle single column', () => {
        const result = parseCSV('a\nb\nc');
        expect(result).toEqual([['a'], ['b'], ['c']]);
    });

    it('should handle empty input', () => {
        const result = parseCSV('');
        expect(result).toEqual([]);
    });

    it('should handle unicode characters', () => {
        const result = parseCSV('이름,나이\n홍길동,25');
        expect(result).toEqual([['이름', '나이'], ['홍길동', '25']]);
    });
});

describe('CSV Escape', () => {
    it('should not escape simple values', () => {
        expect(escapeCSV('hello')).toBe('hello');
    });

    it('should escape values with commas', () => {
        expect(escapeCSV('hello, world')).toBe('"hello, world"');
    });

    it('should escape values with quotes', () => {
        expect(escapeCSV('He said "hi"')).toBe('"He said ""hi"""');
    });

    it('should escape values with newlines', () => {
        expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
    });
});
