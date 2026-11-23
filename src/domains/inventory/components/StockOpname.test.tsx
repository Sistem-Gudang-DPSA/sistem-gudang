import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import StockOpname from './StockOpname';

const xlsx = vi.hoisted(() => ({
  utils: { aoa_to_sheet: vi.fn(() => ({})), book_new: vi.fn(() => ({})), book_append_sheet: vi.fn() },
  writeFile: vi.fn(),
}));
vi.mock('xlsx', () => xlsx);

const detail = (id: number, month: number) => ({ ...row(id), month, notes: null, lines: [{ itemCode: 'B-1', itemName: 'Paku', unit: 'kg', category: 'Bahan', systemQty: 1, physicalQty: 1, difference: 0, note: null }] });

const row = (id: number) => ({ id, month: 3, year: 2026, createdAt: '2026-03-31T00:00:00Z', createdBy: 'Admin' });
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/stock-opname').at(-1)!.query;

describe('StockOpname list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('menempatkan checkbox sebelum No tanpa tulisan Check dan tetap dapat memilih baris', async () => {
    installFakeApi({ 'GET /api/v1/stock-opname': paged([row(1), row(2)]) });
    render(<StockOpname />);
    await screen.findAllByText('Stok Opname Maret 2026');
    const rows = screen.getAllByRole('row');
    const selectAll = within(rows[0].children[0] as HTMLElement).getByRole('checkbox', { name: 'Pilih semua stok opname' }) as HTMLInputElement;
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

  it('keeps the checked periods when the search changes', async () => {
    installFakeApi({ 'GET /api/v1/stock-opname': paged([row(1), row(2)]) });
    render(<StockOpname />);
    const first = await screen.findByLabelText('Pilih Stok Opname Maret 2026 #1') as HTMLInputElement;
    fireEvent.click(first);
    expect(screen.getByRole('status').textContent).toContain('1 baris dipilih');
    fireEvent.change(screen.getByPlaceholderText('Cari periode stok opname...'), { target: { value: 'Maret' } });
    await waitFor(() => expect((first as HTMLInputElement).checked).toBe(true));
    expect(screen.getByRole('status').textContent).toContain('1 baris dipilih');
    fireEvent.click(screen.getByLabelText('Pilih Stok Opname Maret 2026 #2'));
    expect(screen.getByRole('status').textContent).toContain('2 baris dipilih');
    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan pilihan' }));
    await waitFor(() => expect((screen.getByLabelText('Pilih Stok Opname Maret 2026 #1') as HTMLInputElement).checked).toBe(false));
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

  it('loads every page without pagination', async () => {
    const api = installFakeApi({
      'GET /api/v1/stock-opname': (req: { query: URLSearchParams }) => ({
        rows: req.query.get('page') === '2' ? [row(3)] : [row(1), row(2)],
        total: 150,
        page: Number(req.query.get('page')),
        pageSize: 100,
      }),
    });
    render(<StockOpname />);
    await screen.findAllByText('Stok Opname Maret 2026');
    expect(api.calls('GET /api/v1/stock-opname').map((c) => c.query.get('page'))).toEqual(['1', '2']);
    expect(screen.queryByText('Selanjutnya')).toBeNull();
  });

  it('exports every filtered period without a selection', async () => {
    installFakeApi({
      'GET /api/v1/stock-opname': paged([row(1), row(2)]),
      'GET /api/v1/stock-opname/1': detail(1, 3),
      'GET /api/v1/stock-opname/2': detail(2, 4),
    });
    render(<StockOpname />);
    await screen.findAllByText(/Stok Opname Maret 2026/);
    fireEvent.click(screen.getByTitle('Export Excel'));
    await waitFor(() => expect(xlsx.writeFile).toHaveBeenCalled());
    expect(xlsx.utils.book_append_sheet).toHaveBeenCalledTimes(2);
    expect(xlsx.writeFile.mock.calls[0][1]).toBe('Stok_Opname.xlsx');
  });

  it('exports one sheet per selected period', async () => {
    installFakeApi({
      'GET /api/v1/stock-opname': paged([row(1), row(2)]),
      'GET /api/v1/stock-opname/1': detail(1, 3),
      'GET /api/v1/stock-opname/2': detail(2, 4),
    });
    render(<StockOpname />);
    await screen.findAllByText(/Stok Opname Maret 2026/);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    fireEvent.click(screen.getByTitle('Export Excel'));
    await waitFor(() => expect(xlsx.writeFile).toHaveBeenCalled());
    expect(xlsx.utils.book_append_sheet).toHaveBeenCalledTimes(1);
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
