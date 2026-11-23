import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import StockOpname from './StockOpname';
import { opnameDraftKey, writeOpnameDraft, type OpnameDraft } from '../stock-opname-draft';
import { AuthUserProvider } from '@/domains/auth/user-context';

const nav = vi.hoisted(() => ({ pathname: '/dashboard/gudang/transaksi/stock-opname' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
beforeEach(() => { localStorage.clear(); nav.pathname = '/dashboard/gudang/transaksi/stock-opname'; });

const xlsx = vi.hoisted(() => ({
  utils: { aoa_to_sheet: vi.fn(() => ({})), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
  writeFile: vi.fn(),
}));
vi.mock('xlsx', () => xlsx);

const detail = (id: number, month: number) => ({ ...row(id), month, notes: null, lines: [{ itemCode: 'B-1', itemName: 'Paku', unit: 'kg', category: 'Bahan', systemQty: 1, physicalQty: 1, difference: 0, note: null }] });

const row = (id: number) => ({ id, month: 3, year: 2026, createdAt: '2026-03-31T00:00:00Z', createdBy: 'Admin' });
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/stock-opname').at(-1)!.query;

describe('StockOpname list', () => {
  it('menempatkan checkbox sebelum No tanpa tulisan Check dan tetap dapat memilih baris', async () => {
    installFakeApi({ 'GET /api/v1/stock-opname': paged([row(1), row(2)]) });
    render(<StockOpname />);
    await screen.findAllByText('Stok Opname Maret 2026');
    const rows = screen.getAllByRole('row');
    const selectAll = within(rows[0].children[0] as HTMLElement).getByRole('checkbox', { name: 'Pilih semua stok opname di halaman ini' }) as HTMLInputElement;
    expect(rows[0].children[1].textContent).toBe('No');
    expect(screen.queryByText('Check')).toBeNull();
    const first = within(rows[1].children[0] as HTMLElement).getByRole('checkbox', { name: 'Pilih Stok Opname Maret 2026 #1' }) as HTMLInputElement;
    const second = within(rows[2].children[0] as HTMLElement).getByRole('checkbox') as HTMLInputElement;
    fireEvent.click(selectAll);
    expect(first.checked).toBe(true);
    expect(second.checked).toBe(true);
    fireEvent.click(first);
    expect(selectAll.checked).toBe(false);
    expect(first.checked).toBe(false);
    expect(second.checked).toBe(true);
  });

  it('filters by month and year, without a day select, and sorts by period', async () => {
    const api = installFakeApi({ 'GET /api/v1/stock-opname': paged([row(1)]) });
    render(<StockOpname />);
    await screen.findByText('Stok Opname Maret 2026');

    expect(screen.queryByText('Hari')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Filter/ }));
    fireEvent.change(screen.getByDisplayValue('Bulan'), { target: { value: '03' } });
    await waitFor(() => expect(lastQ(api).get('month')).toBe('3'));
    fireEvent.change(screen.getByDisplayValue('Tahun'), { target: { value: '2026' } });
    await waitFor(() => expect(lastQ(api).get('year')).toBe('2026'));
    expect(screen.getByRole('button', { name: /Filter \(2\)/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Periode Stock Opname/ }));
    await waitFor(() => expect(lastQ(api).get('sortBy')).toBe('period'));
  });

  it('exports one sheet per selected period', async () => {
    installFakeApi({
      'GET /api/v1/stock-opname': paged([row(1), row(2)]),
      'GET /api/v1/stock-opname/1': detail(1, 3),
      'GET /api/v1/stock-opname/2': detail(2, 4),
    });
    render(<StockOpname />);
    await screen.findAllByText(/Stok Opname Maret 2026/);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByTitle('Export Excel'));
    await waitFor(() => expect(xlsx.writeFile).toHaveBeenCalled());
    expect(xlsx.utils.book_append_sheet).toHaveBeenCalledTimes(2);
    expect(xlsx.writeFile.mock.calls[0][1]).toBe('Stok_Opname.xlsx');
  });

  it('shows the export error instead of swallowing it', async () => {
    installFakeApi({ 'GET /api/v1/stock-opname': paged([row(1)]), 'GET /api/v1/stock-opname/1': fail(500, 'Server error') });
    render(<StockOpname />);
    await screen.findByText('Stok Opname Maret 2026');
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByTitle('Export Excel'));
    expect(await screen.findByText('Server error')).toBeTruthy();
  });
});


describe.each(['/dashboard/gudang', '/dashboard/gudang-barang-jadi'])('daftar draft %s', (base) => {
  const draft: OpnameDraft = { version: 1, month: '3', year: '2026', savedAt: '2026-03-01T00:00:00Z', rows: [{ itemId: '1', itemName: 'Triplex', code: 'B-1', unit: 'lbr', category: 'Bahan', price: 1000, stock: 10, jumlah: '8', keterangan: '' }] };

  it('menampilkan draft di bawah data final, terbaru dahulu, dengan tautan khusus tiap draft', async () => {
    nav.pathname = `${base}/transaksi/stock-opname`;
    const key = opnameDraftKey(base, undefined);
    localStorage.setItem(key, JSON.stringify(draft));
    writeOpnameDraft(key, 'newest', { ...draft, savedAt: '2026-03-02T00:00:00Z' });
    installFakeApi({ 'GET /api/v1/stock-opname': paged([row(1)]) });
    render(<StockOpname />);
    const section = await screen.findByRole('region', { name: 'Draft Stok Opname (2)' });
    const drafts = within(section);
    const links = drafts.getAllByRole('link', { name: 'Lanjutkan Draft' });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      `${base}/transaksi/stock-opname/tambah?draft=newest`,
      `${base}/transaksi/stock-opname/tambah?draft=legacy`,
    ]);
    expect(drafts.getAllByText('Triplex')).toHaveLength(2);
    expect(drafts.getByText('Draft lama')).not.toBeNull();
    expect(section.querySelector('time')?.getAttribute('datetime')).toBe('2026-03-02T00:00:00Z');
    expect(screen.getByRole('link', { name: 'Tambah Data' }).getAttribute('href')).toBe(`${base}/transaksi/stock-opname/tambah`);
    expect(screen.getByRole('link', { name: 'Detail' }).compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('menyembunyikan daftar draft dan tombol tambah tanpa izin create', async () => {
    nav.pathname = `${base}/transaksi/stock-opname`;
    writeOpnameDraft(opnameDraftKey(base, 1), 'hidden', draft);
    installFakeApi({ 'GET /api/v1/stock-opname': paged([]) });
    render(<AuthUserProvider user={{ id: 1, username: 'viewer', email: 'viewer@example.com', roleId: 1, roleName: 'Viewer', isSuperadmin: false, permissions: ['stock-opname.view'] }}><StockOpname /></AuthUserProvider>);
    await screen.findByText('Data tidak ditemukan untuk filter tersebut.');
    expect(screen.queryByRole('region', { name: /Draft Stok Opname/ })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Lanjutkan Draft' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Tambah Data' })).toBeNull();
  });
});
