import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { installFakeApi } from '@/test/fake-api';
import ImportBarangMapping from './ImportBarangMapping';

const rows = [
  { name: 'Light Green', code: 'TH 039 AA', detail: 'TACO TH', price: 100, stock: 4 },
  { name: 'Handle A', code: '', detail: '', price: 0, stock: 31.5 },
  { name: 'Handle B', code: '', detail: '', price: 0, stock: 2 },
];
const options = { suppliers: ['PT Makmur'], categories: ['Lembaran', 'Hardware'], units: ['lembar', 'pcs'], locations: ['A01'] };
const pick = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ImportBarangMapping', () => {
  it('needs kategori, satuan and lokasi on every row before Simpan', async () => {
    const api = installFakeApi({ 'POST /api/v1/items/bulk': { dryRun: false, created: 3, skipped: [] } });
    const onDone = vi.fn();
    render(<ImportBarangMapping rows={rows} options={options} onClose={vi.fn()} onDone={onDone} />);
    const simpan = screen.getByText('Simpan') as HTMLButtonElement;
    expect(simpan.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Cari barang'), { target: { value: 'handle' } });
    fireEvent.click(screen.getByLabelText('Pilih semua yang tampil'));
    pick('Kategori massal', 'Hardware'); pick('Satuan massal', 'pcs'); pick('Lokasi massal', 'A01');
    fireEvent.click(screen.getByText('Terapkan ke yang dipilih'));
    expect(simpan.disabled).toBe(true); // Light Green belum dipetakan

    fireEvent.change(screen.getByLabelText('Cari barang'), { target: { value: '' } });
    fireEvent.click(screen.getByLabelText('Pilih Handle A'));
    fireEvent.click(screen.getByLabelText('Pilih Handle B'));
    fireEvent.click(screen.getByLabelText('Pilih Light Green'));
    pick('Kategori massal', 'Lembaran'); pick('Satuan massal', 'lembar'); pick('Lokasi massal', 'A01');
    fireEvent.click(screen.getByText('Terapkan ke yang dipilih'));
    expect(simpan.disabled).toBe(false);

    fireEvent.click(simpan);
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('3 barang ditambahkan.'));
    const items = (api.calls('POST /api/v1/items/bulk')[0].body as { items: Record<string, unknown>[] }).items;
    expect(items[0]).toEqual({ name: 'Light Green', code: 'TH 039 AA', detail: 'TACO TH', price: 100, stock: 4, category: 'Lembaran', unit: 'lembar', locationCode: 'A01' });
    expect(items[1]).toEqual({ name: 'Handle A', price: 0, stock: 31.5, category: 'Hardware', unit: 'pcs', locationCode: 'A01' });
  });

  it('Belum lengkap saja also counts a row that only lacks lokasi', () => {
    render(<ImportBarangMapping rows={rows.slice(0, 1)} options={options} onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Kategori Light Green'), { target: { value: 'Lembaran' } });
    fireEvent.change(screen.getByLabelText('Satuan Light Green'), { target: { value: 'lembar' } });
    fireEvent.click(screen.getByLabelText('Belum lengkap saja'));
    expect(screen.getByLabelText('Kategori Light Green')).toBeTruthy(); // lokasi masih kosong, baris tetap tampil
    fireEvent.change(screen.getByLabelText('Lokasi Light Green'), { target: { value: 'A01' } });
    expect(screen.queryByLabelText('Kategori Light Green')).toBeNull();
  });

  it('edits a cell with its own dropdown and Ctrl+D copies the value from the row above', () => {
    render(<ImportBarangMapping rows={rows} options={options} onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Kategori Light Green'), { target: { value: 'Lembaran' } });
    expect((screen.getByLabelText('Kategori Light Green') as HTMLSelectElement).value).toBe('Lembaran');
    fireEvent.keyDown(screen.getByLabelText('Kategori Handle A'), { key: 'd', ctrlKey: true });
    fireEvent.keyDown(screen.getByLabelText('Kategori Handle B'), { key: 'd', ctrlKey: true });
    expect((screen.getByLabelText('Kategori Handle A') as HTMLSelectElement).value).toBe('Lembaran');
    expect((screen.getByLabelText('Kategori Handle B') as HTMLSelectElement).value).toBe('Lembaran');
    fireEvent.keyDown(screen.getByLabelText('Kategori Light Green'), { key: 'd', ctrlKey: true }); // baris pertama: tidak ada di atasnya
    expect((screen.getByLabelText('Kategori Light Green') as HTMLSelectElement).value).toBe('Lembaran');
  });

  it('marks the row that holds focus as active', () => {
    render(<ImportBarangMapping rows={rows} options={options} onClose={vi.fn()} onDone={vi.fn()} />);
    const row = (name: string) => screen.getByLabelText(`Kategori ${name}`).closest('tr')!;
    expect(row('Handle A').dataset.active).toBe('false');
    fireEvent.focus(screen.getByLabelText('Satuan Handle A'));
    expect(row('Handle A').dataset.active).toBe('true');
    fireEvent.focus(screen.getByLabelText('Lokasi Handle B'));
    expect(row('Handle A').dataset.active).toBe('false');
    expect(row('Handle B').dataset.active).toBe('true');
  });

  it('supplier is optional: Simpan stays possible without it, and a chosen one is sent', async () => {
    const api = installFakeApi({ 'POST /api/v1/items/bulk': { dryRun: false, created: 2, skipped: [] } });
    render(<ImportBarangMapping rows={rows.slice(0, 2)} options={options} onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Pilih semua yang tampil'));
    pick('Kategori massal', 'Hardware'); pick('Satuan massal', 'pcs'); pick('Lokasi massal', 'A01');
    fireEvent.click(screen.getByText('Terapkan ke yang dipilih'));
    fireEvent.change(screen.getByLabelText('Supplier Handle A'), { target: { value: 'PT Makmur' } });
    const simpan = screen.getByText('Simpan') as HTMLButtonElement;
    expect(simpan.disabled).toBe(false);
    fireEvent.click(simpan);
    await waitFor(() => expect(api.calls('POST /api/v1/items/bulk')).toHaveLength(1));
    const items = (api.calls('POST /api/v1/items/bulk')[0].body as { items: Record<string, unknown>[] }).items;
    expect(items[0]).not.toHaveProperty('supplier');
    expect(items[1]).toMatchObject({ name: 'Handle A', supplier: 'PT Makmur' });
  });

  it('hides the supplier column without item.set-supplier', () => {
    render(<ImportBarangMapping rows={rows} options={options} canSetSupplier={false} onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.queryByLabelText('Supplier Handle A')).toBeNull();
    expect(screen.queryByLabelText('Supplier massal')).toBeNull();
    expect(screen.getByLabelText('Kategori Handle A')).toBeTruthy();
  });
});
