import { downloadBlob } from './download';

// RFC 4180: every field quoted, embedded quotes doubled, CRLF line breaks.
export const toCsv = (rows: unknown[][]): string =>
  rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');

export function downloadCsv(filename: string, rows: unknown[][]): void {
  downloadBlob(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }), filename);
}
