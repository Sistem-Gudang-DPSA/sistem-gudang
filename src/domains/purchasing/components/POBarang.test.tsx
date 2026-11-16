import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import { downloadBlob } from '@/shared/lib/download';
import POBarang from './POBarang';

vi.mock('@/shared/lib/download', () => ({ downloadBlob: vi.fn() }));

const request = (id: number) => ({
  id, type: 'purchase-request', status: 'approved', createdAt: '2026-05-01T00:00:00Z',
  payload: { notes: `Permintaan ${id}`, items: [] },
});
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/approvals').at(-1)!.query;

describe('purchasing POBarang', () => {
  it('sends the sort column and direction and returns to page 1', async () => {
    const api = installFakeApi({ 'GET /api/v1/approvals': paged([request(1)], { total: 45 }) });
    render(<POBarang />);
    await screen.findByText('Permintaan 1');
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    await waitFor(() => expect(lastQ(api).get('page')).toBe('3'));
    fireEvent.click(screen.getByRole('button', { name: /Tanggal/ }));
    await waitFor(() => expect(lastQ(api).get('sortBy')).toBe('date'));
    expect(lastQ(api).get('sortDir')).toBe('asc');
    expect(lastQ(api).get('page')).toBe('1');
  });

  it('exports a CSV with matching headers, escaped fields, and can export twice', async () => {
    installFakeApi({ 'GET /api/v1/approvals': paged([{ ...request(1), payload: { notes: 'Paku "besar", 5kg', items: [] } }]) });
    render(<POBarang />);
    await screen.findByText('Paku "besar", 5kg');
    const btn = screen.getByRole('button', { name: /Export Excel/ });
    fireEvent.click(btn);
    fireEvent.click(btn);
    const calls = vi.mocked(downloadBlob).mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0][1]).toBe('Rekap_Pembelian_halaman-1.csv');
    const [head, row] = (await (calls[0][0] as Blob).text()).split('\r\n');
    expect(head).toBe('"No","Tanggal","Permintaan","Status"');
    expect(row).toBe('"1","2026-05-01","Paku ""besar"", 5kg","Disetujui"');
  });
});
