import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import StockOpname from './StockOpname';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/gudang/stock-opname',
}));

const row = (id: number, month = 3, year = 2026) => ({ id, month, year, notes: null, createdBy: 1, createdAt: '2026-03-31T00:00:00.000Z', lineCount: 2 });
const detail = {
  id: 1, month: 3, year: 2026, notes: 'Catatan bulanan', createdBy: 1, createdAt: '2026-03-31T00:00:00.000Z',
  lines: [{ itemId: 1, itemCode: 'BRG-1', itemName: 'Triplex', category: 'Bahan Baku', unit: 'lbr', systemQty: 10, physicalQty: 8, difference: -2, physicalPrice: 1200000, note: 'rusak' }],
};

function setup(extra: Record<string, unknown> = {}, rows: unknown = paged([row(1), row(2, 4, 2025)])) {
  return { api: installFakeApi({ 'GET /api/v1/stock-opname': rows, ...extra }), view: render(<StockOpname />) };
}
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/stock-opname').at(-1)!.query;

describe('StockOpname list', () => {
  it('shows period rows and sends page 1 / pageSize 20', async () => {
    const { api } = setup();
    expect(await screen.findByText('Stok Opname Maret 2026')).not.toBeNull();
    expect(screen.getByText('Stok Opname April 2025')).not.toBeNull();
    expect(lastQ(api).get('page')).toBe('1');
    expect(lastQ(api).get('pageSize')).toBe('20');
    expect(lastQ(api).get('month')).toBeNull();
  });

  it('shows empty state', async () => {
    setup({}, paged([]));
    expect(await screen.findByText('Data tidak ditemukan untuk filter tersebut.')).not.toBeNull();
  });

  it('shows API error', async () => {
    setup({ 'GET /api/v1/stock-opname': fail(500, 'Gagal total') });
    expect(await screen.findByText(/Gagal total|Gagal memuat/)).not.toBeNull();
  });

  it('sends search + month/year as numbers, resets page, next requests page 2', async () => {
    const { api } = setup({}, paged([row(1)], { total: 50 }));
    await screen.findByText('Stok Opname Maret 2026');
    fireEvent.click(screen.getByText('Selanjutnya'));
    await waitFor(() => expect(lastQ(api).get('page')).toBe('2'));
    const search = screen.getByPlaceholderText('Cari periode stok opname...') as HTMLInputElement;
    expect(search.maxLength).toBe(100);
    fireEvent.change(search, { target: { value: 'maret' } });
    await waitFor(() => expect(lastQ(api).get('search')).toBe('maret'));
    expect(lastQ(api).get('page')).toBe('1');
    const [month, year] = Array.from(document.querySelectorAll('select'));
    fireEvent.change(month, { target: { value: '03' } });
    fireEvent.change(year, { target: { value: '2026' } });
    await waitFor(() => expect(lastQ(api).get('year')).toBe('2026'));
    expect(lastQ(api).get('month')).toBe('3');
    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => expect(lastQ(api).get('month')).toBeNull());
  });
});

describe('StockOpname detail', () => {
  it('fetches and shows detail with signed difference and price', async () => {
    const { api } = setup({ 'GET /api/v1/stock-opname/1': detail });
    await screen.findByText('Stok Opname Maret 2026');
    fireEvent.click(screen.getAllByText('Detail')[0]);
    expect(await screen.findByText('Catatan bulanan')).not.toBeNull();
    expect(api.calls('GET /api/v1/stock-opname/1').length).toBe(1);
    expect(screen.getByText('-2')).not.toBeNull();
    expect(screen.getByText('rusak')).not.toBeNull();
    expect(screen.getByText((1200000).toLocaleString('id-ID'))).not.toBeNull();
    fireEvent.click(screen.getByText('Tutup'));
    expect(screen.queryByText('Catatan bulanan')).toBeNull();
  });

  it('shows detail error and keeps list', async () => {
    setup({ 'GET /api/v1/stock-opname/1': fail(404, 'Tidak ditemukan') });
    await screen.findByText('Stok Opname Maret 2026');
    fireEvent.click(screen.getAllByText('Detail')[0]);
    expect(await screen.findByText('Tidak ditemukan')).not.toBeNull();
    expect(screen.getByText('Stok Opname Maret 2026')).not.toBeNull();
  });

  it('disables Detail buttons while loading', async () => {
    setup({ 'GET /api/v1/stock-opname/1': () => detail });
    await screen.findByText('Stok Opname Maret 2026');
    const btn = screen.getAllByText('Detail')[0].closest('button') as HTMLButtonElement;
    fireEvent.click(btn);
    expect(btn.disabled).toBe(true);
    await screen.findByText('Catatan bulanan');
  });
});
