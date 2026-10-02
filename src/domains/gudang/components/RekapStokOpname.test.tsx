import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viCfg } from 'vitest';
viCfg.setConfig({ testTimeout: 30000 });
import RekapStokOpname from './RekapStokOpname';

const LIST = 'GET /api/v1/stock-opname';
const so = { id: 5, month: 3, year: 2026, notes: null, createdBy: 7, createdAt: '2026-03-31T10:00:00', lineCount: 1 };
const detail = { id: 5, month: 3, year: 2026, notes: null, createdBy: 7, createdAt: '2026-03-31', lines: [
  { itemId: 1, itemCode: 'BRG-1', itemName: 'Triplex', category: 'Kayu', unit: 'lbr', systemQty: 10, physicalQty: 8, difference: -2, note: 'rusak' },
] };
const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls(LIST).at(-1)!.query;

describe('RekapStokOpname', () => {
  it('shows rows', async () => {
    installFakeApi({ [LIST]: paged([so]) });
    render(<RekapStokOpname />);
    expect(await screen.findByText('Stok Opname Maret 2026')).toBeTruthy();
    expect(screen.getByText('31-03-2026')).toBeTruthy();
    expect(screen.getByText('User #7')).toBeTruthy();
  });

  it('shows empty state and API error', async () => {
    installFakeApi({ [LIST]: paged([]) });
    const a = render(<RekapStokOpname />);
    expect(await screen.findByText('Tidak ada data stok opname ditemukan.')).toBeTruthy();
    a.unmount();
    installFakeApi({ [LIST]: fail(500, 'Gagal DB') });
    render(<RekapStokOpname />);
    expect(await screen.findByText('Gagal DB')).toBeTruthy();
  });

  it('search and date map to search/year/month params', async () => {
    const api = installFakeApi({ [LIST]: paged([so]) });
    const { container } = render(<RekapStokOpname />);
    await screen.findByText('Stok Opname Maret 2026');
    expect(lastQuery(api).get('pageSize')).toBe('100');
    expect(lastQuery(api).get('year')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText(/Cari Auditor/), { target: { value: 'andi' } });
    fireEvent.change(container.querySelector('input[type=date]')!, { target: { value: '2026-02-14' } });
    await waitFor(() => expect(lastQuery(api).get('month')).toBe('2'));
    expect(lastQuery(api).get('year')).toBe('2026');
    expect(lastQuery(api).get('search')).toBe('andi');
  });

  it('opens detail via /stock-opname/{id} and reports a failure', async () => {
    const api = installFakeApi({ [LIST]: paged([so]), 'GET /api/v1/stock-opname/5': detail });
    render(<RekapStokOpname />);
    fireEvent.click(await screen.findByText('View Detail'));
    expect(await screen.findByText('10 lbr')).toBeTruthy();
    expect(screen.getByText('8 lbr')).toBeTruthy();
    expect(screen.getByText('rusak')).toBeTruthy();
    expect(api.calls('GET /api/v1/stock-opname/5')).toHaveLength(1);
  });

  it('shows an error when detail fails', async () => {
    installFakeApi({ [LIST]: paged([so]), 'GET /api/v1/stock-opname/5': fail(404, 'Tidak ditemukan') });
    render(<RekapStokOpname />);
    fireEvent.click(await screen.findByText('View Detail'));
    expect(await screen.findByText('Tidak ditemukan')).toBeTruthy();
  });
});
