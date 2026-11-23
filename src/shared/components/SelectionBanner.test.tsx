import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SelectionBanner from './SelectionBanner';

describe('SelectionBanner', () => {
  it('stays hidden when nothing is selected', () => {
    render(<SelectionBanner count={0} onClear={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows the total selected and clears it', () => {
    const onClear = vi.fn();
    render(<SelectionBanner count={3} unit="barang" onClear={onClear} />);
    expect(screen.getByRole('status').textContent).toContain('3 barang dipilih');
    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan pilihan' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
