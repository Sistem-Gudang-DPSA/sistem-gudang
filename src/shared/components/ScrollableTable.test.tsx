import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScrollableTable from './ScrollableTable';

describe('ScrollableTable', () => {
  it('fits the scroll area to the remaining viewport height and keeps the print overrides', () => {
    render(<ScrollableTable ariaLabel="Tabel uji"><p>isi tabel</p></ScrollableTable>);
    const region = screen.getByRole('region', { name: 'Tabel uji' });
    // jsdom: tabel di posisi 0, jadi tinggi = viewport dikurangi ruang footer (96px).
    expect(region.style.getPropertyValue('--table-max-h')).toBe(`${window.innerHeight - 96}px`);
    expect(region.className).toContain('overflow-auto');
    expect(region.className).toContain('print:max-h-none');
    expect(region.className).toContain('print:overflow-visible');
    expect(region.textContent).toContain('isi tabel');
  });
});
