// RFC 4180: every field quoted, embedded quotes doubled, CRLF line breaks.
export const toCsv = (rows: unknown[][]): string =>
  rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
