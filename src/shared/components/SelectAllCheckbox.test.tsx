import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SelectAllCheckbox from './SelectAllCheckbox';

describe('SelectAllCheckbox', () => {
  it('sets the indeterminate state when only some rows are selected', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SelectAllCheckbox checked={false} indeterminate onChange={onChange} ariaLabel="Pilih semua barang" />);
    const box = screen.getByRole('checkbox', { name: 'Pilih semua barang' }) as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalled();

    rerender(<SelectAllCheckbox checked onChange={onChange} ariaLabel="Pilih semua barang" />);
    expect(box.indeterminate).toBe(false);
  });
});
