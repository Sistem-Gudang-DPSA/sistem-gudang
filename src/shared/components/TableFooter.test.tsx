import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TableFooter from './TableFooter';

describe('TableFooter', () => {
  it('shows the filtered total and changes the visible-row count', () => {
    const onChange = vi.fn();
    render(<TableFooter total={1234} visibleRows={20} onVisibleRowsChange={onChange} unit="barang" />);
    expect(screen.getByText(/Total 1\.234 barang terfilter/)).toBeTruthy();
    const select = screen.getByLabelText('Baris terlihat') as HTMLSelectElement;
    expect(select.value).toBe('20');
    expect([...select.options].map((o) => o.value)).toEqual(['20', '50', '100']);
    fireEvent.change(select, { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(50);
  });
});
