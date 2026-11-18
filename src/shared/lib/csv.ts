import { downloadBlob } from './download';

// Text starting with = + - @ (or tab/CR) would run as a formula in Excel; a leading apostrophe makes it plain text.
// Plain numbers and phone-like values ("-5", "+62 812-3456", "1.234,5") and a lone "-" are left alone.
const PLAIN = /^[+-]?[\d\s().,-]+$/;
const neutralise = (v: unknown): string => {
  const text = String(v ?? '');
  return typeof v === 'string' && /^[=+\-@\t\r]/.test(text) && text !== '-' && !PLAIN.test(text) ? `'${text}` : text;
};

// RFC 4180: every field quoted, embedded quotes doubled, CRLF line breaks.
export const toCsv = (rows: unknown[][]): string =>
  rows.map((r) => r.map((v) => `"${neutralise(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');

export function downloadCsv(filename: string, rows: unknown[][]): void {
  downloadBlob(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }), filename);
}
