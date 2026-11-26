import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import StockOpname from './StockOpname';
import { StockOpnameList } from './StockOpname';

const nav = vi.hoisted(() => ({ pathname: '/dashboard/gudang/transaksi/stock-opname', push: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname, useRouter: () => ({ push: nav.push }) }));
beforeEach(() => { nav.pathname = '/dashboard/gudang/transaksi/stock-opname'; nav.push.mockClear(); vi.clearAllMocks(); });

const xlsx = vi.hoisted(() => ({
  utils: { aoa_to_sheet: vi.fn(() => ({})), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
  writeFile: vi.fn(),
}));
vi.mock('xlsx', () => xlsx);

const row = (id: number, status = 'SUBMITTED') => ({ id, month: 3, year: 2026, status, progress: { filled: 2, total: 10 }, notes: null, createdBy: 1, createdAt: '2026-03-31T00:00:00Z' });
const detail = (id: number) => ({ ...row(id), lines: [{ itemId: 1, itemCode: 'B-1', itemName: 'Paku', unit: 'kg', category: 'Bahan', systemQty: null, physicalQty: 1, difference: null, systemPrice: null, physicalPrice: null, note: null }] });
const permissions = ['stock-opname.view', 'stock-opname.open'];

describe('StockOpname list', () => {
  it('shows status and progress, and links OPEN rows to the fill form', async () => {
    nav.pathname = '/dashboard/gudang/transaksi/stock-opname';
    installFakeApi({ 'GET /api/v1/stock-opname': paged([row(1, 'OPEN'), row(2, 'SUBMITTED')]) });
    render(withUser(<StockOpname />, ['stock-opname.view', 'stock-opname.create']));
    expect((await screen.findAllByText('Stok Opname Maret 2026')).length).toBe(2);
    expect(screen.getAllByText('2 / 10')).toHaveLength(2);
    expect(screen.getByRole('link', { name: /Isi Opname/ }).getAttribute('href')).toBe('/dashboard/gudang/transaksi/stock-opname/isi/1');
    expect(screen.getByRole('link', { name: /Detail/ }).getAttribute('href')).toBe('/dashboard/gudang/transaksi/stock-opname/2');
  });

  it('does not offer open-period or create buttons to Gudang', async () => {
    installFakeApi({ 'GET /api/v1/stock-opname': paged([]) });
    render(withUser(<StockOpname />, ['stock-opname.view', 'stock-opname.create']));
    await screen.findByText(/Data tidak ditemukan/);
    expect(screen.queryByRole('button', { name: 'Buka Periode' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Tambah/ })).toBeNull();
  });

  it('lets PPIC open a period and navigates to the new opname', async () => {
    installFakeApi({
      'GET /api/v1/stock-opname': paged([]),
      'POST /api/v1/stock-opname': { ...row(9, 'OPEN'), id: 9 },
    });
    render(withUser(<StockOpnameList basePath="/dashboard/ppic" mode="ppic" />, permissions));
    fireEvent.click(await screen.findByRole('button', { name: 'Buka Periode' }));
    fireEvent.change(screen.getByLabelText('Bulan opname'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('Tahun opname'), { target: { value: '2026' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Buka Periode' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/dashboard/ppic/transaksi/stock-opname/9'));
  });

  it('opens the existing opname when the period already exists', async () => {
    const api = installFakeApi({
      'GET /api/v1/stock-opname': paged([row(4)]),
      'POST /api/v1/stock-opname': fail(409, 'Opname bulan ini sudah ada'),
    });
    render(withUser(<StockOpnameList basePath="/dashboard/ppic" mode="ppic" />, permissions));
    fireEvent.click(await screen.findByRole('button', { name: 'Buka Periode' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Buka Periode' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/dashboard/ppic/transaksi/stock-opname/4'));
    expect(api.calls('GET /api/v1/stock-opname').at(-1)!.query.get('month')).toBe(String(new Date().getMonth() + 1));
  });

  it('lets PPIC close an OPEN session from the list', async () => {
    const api = installFakeApi({
      'GET /api/v1/stock-opname': paged([row(1, 'OPEN')]),
      'POST /api/v1/stock-opname/1/submit': { ...row(1, 'SUBMITTED') },
    });
    render(withUser(<StockOpnameList basePath="/dashboard/ppic" mode="ppic" />, permissions));
    fireEvent.click(await screen.findByRole('button', { name: 'Tutup Sesi' }));
    expect(within(screen.getByRole('dialog')).getByText(/Tutup sesi Stok Opname Maret 2026/)).not.toBeNull();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Ya, Tutup Sesi' }));
    await waitFor(() => expect(api.calls('POST /api/v1/stock-opname/1/submit')).toHaveLength(1));
  });

  it('does not show Tutup Sesi to Gudang', async () => {
    installFakeApi({ 'GET /api/v1/stock-opname': paged([row(1, 'OPEN')]) });
    render(withUser(<StockOpname />, ['stock-opname.view', 'stock-opname.create']));
    await screen.findByRole('link', { name: /Isi Opname/ });
    expect(screen.queryByRole('button', { name: 'Tutup Sesi' })).toBeNull();
  });

  it('filters by month and year and sorts by period', async () => {
    const api = installFakeApi({ 'GET /api/v1/stock-opname': paged([row(1)]) });
    render(withUser(<StockOpname />, ['stock-opname.view']));
    await screen.findByText('Stok Opname Maret 2026');
    fireEvent.click(screen.getByRole('button', { name: /Filter/ }));
    const [bulan, tahun] = screen.getAllByRole('combobox');
    fireEvent.change(bulan, { target: { value: '03' } });
    fireEvent.change(tahun, { target: { value: '2026' } });
    await waitFor(() => expect(api.calls('GET /api/v1/stock-opname').at(-1)!.query.get('month')).toBe('3'));
    expect(api.calls('GET /api/v1/stock-opname').at(-1)!.query.get('year')).toBe('2026');
    fireEvent.click(screen.getByRole('button', { name: /Periode Stock Opname/ }));
    await waitFor(() => expect(api.calls('GET /api/v1/stock-opname').at(-1)!.query.get('sortBy')).toBe('period'));
  });

  it('exports opname data from the detail endpoint and writes null as a dash', async () => {
    const api = installFakeApi({ 'GET /api/v1/stock-opname': paged([row(1)]), 'GET /api/v1/stock-opname/1': detail(1) });
    render(withUser(<StockOpname />, ['stock-opname.view']));
    fireEvent.click(await screen.findByRole('button', { name: 'Export Excel' }));
    await waitFor(() => expect(xlsx.writeFile).toHaveBeenCalled());
    expect(api.calls('GET /api/v1/stock-opname/1')).toHaveLength(1);
    expect(api.calls('GET /api/v1/items')).toHaveLength(0);
    const sheet = (xlsx.utils.aoa_to_sheet.mock.calls.at(-1) as unknown as [unknown[][]])[0];
    expect(sheet[1]).toEqual([1, 'B-1', 'Paku', 'kg', 'Bahan', 'Disubmit', '-', 1, '-', '-']);
  });

  it('shows the export failure instead of swallowing it', async () => {
    installFakeApi({ 'GET /api/v1/stock-opname': paged([row(1)]), 'GET /api/v1/stock-opname/1': fail(500, 'Server error') });
    render(withUser(<StockOpname />, ['stock-opname.view']));
    fireEvent.click(await screen.findByRole('button', { name: 'Export Excel' }));
    expect(await screen.findByText('Server error')).not.toBeNull();
  });

  it('shows the list error', async () => {
    installFakeApi({ 'GET /api/v1/stock-opname': fail(500, 'Gagal memuat data stok opname.') });
    render(withUser(<StockOpname />, ['stock-opname.view']));
    expect(await screen.findAllByText('Gagal memuat data stok opname.')).not.toBeNull();
  });
});
