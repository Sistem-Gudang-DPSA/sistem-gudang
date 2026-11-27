import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

  it('ignores Enter and hides stale options while a search is pending', () => {
    const onChange = vi.fn();
    render(<SearchableSelect value="" onChange={onChange} onSearch={vi.fn()} pending options={options} placeholder="Pilih" aria-label="Nama barang" />);
    fireEvent.click(screen.getByRole('button', { name: 'Nama barang' }));
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    fireEvent.keyDown(screen.getByLabelText('Cari Nama barang'), { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });
});


describe('SearchableSelect berkelompok', () => {
  const groupedOptions = [
    { value: '1', label: 'PT Kayu', group: 'Supplier Lainnya' },
    { value: '2', label: 'PT Besi', group: 'Supplier Material' },
  ];
  const groups = [{ label: 'Supplier Material', emptyText: 'Belum dipetakan' }, { label: 'Supplier Lainnya' }];

  it('mengurutkan pilihan menurut kelompok dan melewati judul kelompok saat navigasi keyboard', () => {
    const onChange = vi.fn();
    render(<SearchableSelect value="" onChange={onChange} options={groupedOptions} groups={groups} placeholder="Pilih" aria-label="Supplier" />);
    fireEvent.click(screen.getByRole('button', { name: 'Supplier' }));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['PT Besi', 'PT Kayu']);
    expect(within(screen.getByRole('group', { name: 'Supplier Material' })).getByRole('option').textContent).toBe('PT Besi');
    const search = screen.getByLabelText('Cari Supplier');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('mencari di kedua kelompok dan tetap memilih hasil yang tepat dengan Enter', () => {
    const onChange = vi.fn();
    render(<SearchableSelect value="1" onChange={onChange} options={groupedOptions} groups={groups} placeholder="Pilih" aria-label="Supplier" />);
    fireEvent.click(screen.getByRole('button', { name: 'Supplier' }));
    const search = screen.getByLabelText('Cari Supplier');
    fireEvent.change(search, { target: { value: 'BESI' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['PT Besi']);
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('2');
  });

  it('menampilkan kelompok kosong dan garis pemisah tanpa menjadikannya pilihan', () => {
    render(<SearchableSelect value="" onChange={vi.fn()} options={groupedOptions.slice(0, 1)} groups={groups} placeholder="Pilih" aria-label="Supplier" />);
    fireEvent.click(screen.getByRole('button', { name: 'Supplier' }));
    expect(screen.getByText('Belum dipetakan')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Supplier Lainnya' }).parentElement?.className).toContain('border-t');
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });
});
