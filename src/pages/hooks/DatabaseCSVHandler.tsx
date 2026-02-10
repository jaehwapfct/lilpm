import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Download, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { DatabaseProperty, DatabaseRow, PropertyType } from './databaseTypes';

interface DatabaseCSVHandlerProps {
    databaseName: string;
    properties: DatabaseProperty[];
    rows: DatabaseRow[];
    onImport: (rows: Record<string, unknown>[]) => void;
}

export function DatabaseCSVHandler({ databaseName, properties, rows, onImport }: DatabaseCSVHandlerProps) {
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importPreview, setImportPreview] = useState<{ headers: string[]; rows: string[][]; mapped: Record<string, string> } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Export CSV ──────────────────────────────────────────
    const handleExport = () => {
        const headers = properties.map(p => p.name);
        const csvRows = rows.map(row =>
            properties.map(prop => {
                const value = row.properties[prop.id];
                if (value === null || value === undefined) return '';
                if (prop.type === 'select' || prop.type === 'status') {
                    const option = prop.options?.find(o => o.id === value);
                    return option?.name || '';
                }
                if (prop.type === 'multi_select') {
                    const ids = (value as string[]) || [];
                    return prop.options?.filter(o => ids.includes(o.id)).map(o => o.name).join(', ') || '';
                }
                if (prop.type === 'checkbox') return value ? 'true' : 'false';
                if (Array.isArray(value)) return value.join(', ');
                return String(value);
            })
        );

        const csvContent = [
            headers.map(escapeCSV).join(','),
            ...csvRows.map(row => row.map(escapeCSV).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${databaseName.replace(/[^a-zA-Z0-9]/g, '_')}_export.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported ${rows.length} rows to CSV`);
    };

    // ── Import CSV ─────────────────────────────────────────
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
            const text = event.target?.result as string;
            const parsed = parseCSV(text);
            if (parsed.length === 0) {
                toast.error('Could not parse CSV file');
                return;
            }

            const headers = parsed[0];
            const dataRows = parsed.slice(1).filter(row => row.some(cell => cell.trim()));

            // Auto-map headers to properties
            const mapped: Record<string, string> = {};
            headers.forEach((header, idx) => {
                const prop = properties.find(p =>
                    p.name.toLowerCase() === header.toLowerCase().trim()
                );
                if (prop) {
                    mapped[idx.toString()] = prop.id;
                }
            });

            setImportPreview({ headers, rows: dataRows, mapped });
            setImportDialogOpen(true);
            } catch (err) {
                console.error('CSV parse error:', err);
                toast.error('Failed to parse CSV file. Please check the format.');
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    const executeImport = () => {
        if (!importPreview) return;

        const importedRows: Record<string, unknown>[] = importPreview.rows.map(csvRow => {
            const rowData: Record<string, unknown> = {};

            importPreview.headers.forEach((_, colIdx) => {
                const propId = importPreview.mapped[colIdx.toString()];
                if (!propId) return;

                const prop = properties.find(p => p.id === propId);
                if (!prop) return;

                const rawValue = csvRow[colIdx]?.trim() || '';
                if (!rawValue) return;

                rowData[propId] = convertCSVValue(rawValue, prop);
            });

            return rowData;
        });

        onImport(importedRows);
        setImportDialogOpen(false);
        setImportPreview(null);
        toast.success(`Imported ${importedRows.length} rows`);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        CSV
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" /> Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" /> Import from CSV
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Import Preview Dialog */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Import CSV</DialogTitle>
                        <DialogDescription>
                            Preview and confirm the import. {importPreview?.rows.length || 0} rows found.
                        </DialogDescription>
                    </DialogHeader>

                    {importPreview && (
                        <div className="space-y-4">
                            {/* Column Mapping */}
                            <div>
                                <h4 className="text-sm font-medium mb-2">Column Mapping</h4>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {importPreview.headers.map((header, idx) => {
                                        const mappedPropId = importPreview.mapped[idx.toString()];
                                        return (
                                            <div key={idx} className="flex items-center gap-3 text-sm">
                                                <span className="w-32 truncate text-slate-400">{header}</span>
                                                <span className="text-slate-500">→</span>
                                                <select
                                                    value={mappedPropId || ''}
                                                    onChange={(e) => {
                                                        setImportPreview(prev => prev ? {
                                                            ...prev,
                                                            mapped: { ...prev.mapped, [idx.toString()]: e.target.value }
                                                        } : null);
                                                    }}
                                                    className="flex-1 bg-transparent border border-white/10 rounded px-2 py-1 text-sm"
                                                >
                                                    <option value="">Skip</option>
                                                    {properties.map(prop => (
                                                        <option key={prop.id} value={prop.id}>{prop.name}</option>
                                                    ))}
                                                </select>
                                                {mappedPropId ? (
                                                    <Check className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <AlertCircle className="h-4 w-4 text-slate-500" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Preview */}
                            <div>
                                <h4 className="text-sm font-medium mb-2">Preview (first 5 rows)</h4>
                                <div className="border border-white/10 rounded overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-white/10 bg-white/[0.02]">
                                                {importPreview.headers.map((h, i) => (
                                                    <th key={i} className="px-2 py-1 text-left font-medium text-slate-400">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importPreview.rows.slice(0, 5).map((row, rIdx) => (
                                                <tr key={rIdx} className="border-b border-white/5">
                                                    {row.map((cell, cIdx) => (
                                                        <td key={cIdx} className="px-2 py-1 truncate max-w-[150px]">{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
                                <Button onClick={executeImport}>
                                    Import {importPreview.rows.length} rows
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

// ── CSV Utilities ──────────────────────────────────────────
function escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

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

function convertCSVValue(rawValue: string, prop: DatabaseProperty): unknown {
    switch (prop.type) {
        case 'number':
            return Number(rawValue) || null;
        case 'checkbox':
            return rawValue.toLowerCase() === 'true' || rawValue === '1' || rawValue === 'yes';
        case 'select':
        case 'status': {
            const option = prop.options?.find(o => o.name.toLowerCase() === rawValue.toLowerCase());
            return option?.id || null;
        }
        case 'multi_select': {
            const names = rawValue.split(',').map(n => n.trim());
            const ids = names.map(name => prop.options?.find(o => o.name.toLowerCase() === name.toLowerCase())?.id).filter(Boolean);
            return ids.length > 0 ? ids : null;
        }
        case 'date': {
            const d = new Date(rawValue);
            return isNaN(d.getTime()) ? null : d.toISOString();
        }
        default:
            return rawValue;
    }
}
