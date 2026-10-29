import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import POBarang from './POBarang';

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
});
