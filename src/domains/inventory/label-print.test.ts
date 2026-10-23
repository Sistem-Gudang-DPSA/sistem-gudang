import { describe, it, expect } from 'vitest';
import { buildLabelsHtml } from './label-print';

describe('buildLabelsHtml', () => {
  it('makes one QR label per item with a code and skips items without one', async () => {
    const html = await buildLabelsHtml([
      { code: 'A1-03', name: 'BB 18 mm' },
      { code: null, name: 'Tanpa kode' },
    ]);
    expect(html.match(/class="label"/g)?.length).toBe(1);
    expect(html).toContain('<svg');
    expect(html).toContain('BB 18 mm');
    expect(html).toContain('Kode brg: A1-03');
    expect(html).toContain('Loc: -');
    expect(html).not.toContain('[');
    expect(html).not.toContain('Tanpa kode');
  });

  it('shows Kode bawaan in brackets and the location code when given', async () => {
    const html = await buildLabelsHtml([{ code: 'LEM001', name: 'Triplex', externalCode: 'TH 852 J', locationCode: 'A01' }]);
    expect(html).toContain('[TH 852 J]');
    expect(html).toContain('Loc: A01');
    expect(html).toContain('Kode brg: LEM001');
  });

  it('escapes item names and codes', async () => {
    const html = await buildLabelsHtml([{ code: 'X<1>', name: '<img src=x onerror=alert(1)>' }]);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('X&lt;1&gt;');
  });
});
