import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import DataSupplier from './DataSupplier';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/dashboard/purchasing/data-supplier',
}));

const supplier = (id: number) => ({ id, code: `S${id}`, name: `Supplier ${id}`, bank: 'BCA', npwp: '1', phone: '08', address: 'Jl', pajak: 'PKP' });
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/suppliers').at(-1)!.query;

describe('purchasing DataSupplier', () => {
  it('sends the sort column and direction and returns to page 1', async () => {
    const api = installFakeApi({ 'GET /api/v1/suppliers': paged([supplier(1)], { total: 45 }) });
    render(<DataSupplier />);
    await screen.findByText('Supplier 1');
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    await waitFor(() => expect(lastQ(api).get('page')).toBe('3'));
    fireEvent.click(screen.getByRole('button', { name: /Nama Supplier/ }));
    await waitFor(() => expect(lastQ(api).get('sortBy')).toBe('name'));
    expect(lastQ(api).get('sortDir')).toBe('asc');
    expect(lastQ(api).get('page')).toBe('1');
  });

  it('steps back a page when the last row of the last page is deleted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    let total = 21;
    const api = installFakeApi({
      'GET /api/v1/suppliers': (req: { query: URLSearchParams }) =>
        paged(req.query.get('page') === '2' && total === 21 ? [supplier(21)] : [supplier(1)], { total }),
      'DELETE /api/v1/suppliers/21': () => { total = 20; return null; },
    });
    render(<DataSupplier />);
    await screen.findByText('Supplier 1');
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    await screen.findByText('Supplier 21');
    fireEvent.click(screen.getByText('Hapus'));
    await waitFor(() => expect(lastQ(api).get('page')).toBe('1'));
    expect(await screen.findByText('Supplier 1')).not.toBeNull();
  });
});
