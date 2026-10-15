import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchableSelect from './SearchableSelect';

const options = [
  { value: '1', label: 'Triplex 18mm' },
  { value: '2', label: 'Paku Beton' },
  { value: '3', label: 'Lem Kayu' },
];

function setup(value = '') {
  const onChange = vi.fn();
  render(<SearchableSelect value={value} onChange={onChange} options={options} placeholder="Pilih barang" aria-label="Nama barang" />);
  return onChange;
}

describe('SearchableSelect', () => {
  it('shows the placeholder, or the label of the chosen value', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Nama barang' }).textContent).toBe('Pilih barang');
  });

  it('shows the selected label', () => {
    setup('2');
    expect(screen.getByRole('button', { name: 'Nama barang' }).textContent).toBe('Paku Beton');
  });

  it('filters the list by the search text and picks an option on click', () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Nama barang' }));
    expect(screen.getAllByRole('option')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Cari Nama barang'), { target: { value: 'pAk' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Paku Beton']);
    fireEvent.click(screen.getByRole('option', { name: 'Paku Beton' }));
    expect(onChange).toHaveBeenCalledWith('2');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('shows the empty text when nothing matches', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Nama barang' }));
    fireEvent.change(screen.getByLabelText('Cari Nama barang'), { target: { value: 'zzz' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('Tidak ada data')).not.toBeNull();
  });

  it('supports arrow keys + Enter, and Escape closes without choosing', () => {
    const onChange = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Nama barang' }));
    const search = screen.getByLabelText('Cari Nama barang');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('2');

    fireEvent.click(screen.getByRole('button', { name: 'Nama barang' }));
    fireEvent.keyDown(screen.getByLabelText('Cari Nama barang'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('closes on a click outside', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Nama barang' }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
