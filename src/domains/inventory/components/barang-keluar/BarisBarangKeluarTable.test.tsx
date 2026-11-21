import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BarisBarangKeluarTable from './modals/BarisBarangKeluarTable';
import type { BarisForm } from './types';

const itemSearch = { items: [], onSearch: vi.fn(), error: '', pending: false } as unknown as Parameters<typeof BarisBarangKeluarTable>[0]['itemSearch'];

const props = {
  flashItemId: undefined,
  itemSearch,
  pilihanMaterial: () => [],
  onPilihMaterial: vi.fn(),
  patchBaris: vi.fn(),
  setBaris: vi.fn(),
};

describe('tabel barang keluar kosong', () => {
  it('tidak menampilkan kolom hapus saat belum ada baris', () => {
    render(<BarisBarangKeluarTable baris={[]} {...props} />);
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'No', 'Nama Material', 'Satuan/Vol', 'Kode', 'Pengambilan',
    ]);
    expect(screen.queryByRole('button', { name: /Hapus/ })).toBeNull();
  });

  it('menampilkan kolom hapus saat sudah ada baris', () => {
    const baris: BarisForm[] = [{ key: 'k1', itemId: 1, name: 'Triplex', unit: 'lembar', code: 'BRG-1', stock: 10, qty: '1', dokubah: '', manual: false }];
    render(<BarisBarangKeluarTable baris={baris} {...props} />);
    expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Hapus Triplex' })).toBeTruthy();
  });
});
