import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScrollableTable from './ScrollableTable';

describe('ScrollableTable', () => {
  it('sizes the scroll area from the visible rows and keeps the print overrides', () => {
    render(<ScrollableTable visibleRows={20} ariaLabel="Tabel uji"><p>isi tabel</p></ScrollableTable>);
    const region = screen.getByRole('region', { name: 'Tabel uji' });
    expect(region.style.getPropertyValue('--table-max-h')).toBe('1168px');
    expect(region.className).toContain('overflow-auto');
    expect(region.className).toContain('print:max-h-none');
    expect(region.className).toContain('print:overflow-visible');
    expect(region.textContent).toContain('isi tabel');
  });

  it('accepts per-screen row and header heights', () => {
    render(<ScrollableTable visibleRows={50} rowHeightPx={64} headerHeightPx={40}><p>isi</p></ScrollableTable>);
    expect(screen.getByRole('region').style.getPropertyValue('--table-max-h')).toBe('3240px');
  });
});
