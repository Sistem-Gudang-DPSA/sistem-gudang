import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import StockOpname from './StockOpname';

const row = (id: number) => ({ id, month: 3, year: 2026, createdAt: '2026-03-31T00:00:00Z', createdBy: 'Admin' });
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/stock-opname').at(-1)!.query;

describe('StockOpname list', () => {
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
});
