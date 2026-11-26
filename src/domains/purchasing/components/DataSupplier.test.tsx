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
    expect(screen.getByRole('button', { name: 'Import Excel' }).querySelector('.lucide-file-down')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    await waitFor(() => expect(lastQ(api).get('page')).toBe('3'));
    fireEvent.click(screen.getByRole('button', { name: /Nama Supplier/ }));
    await waitFor(() => expect(lastQ(api).get('sortBy')).toBe('name'));
    expect(lastQ(api).get('sortDir')).toBe('asc');
    expect(lastQ(api).get('page')).toBe('1');
  });

  it('has the same columns as superadmin: no No column, Pajak filter, or inline edit', async () => {
    installFakeApi({ 'GET /api/v1/suppliers': paged([supplier(1)]) });
    render(<DataSupplier />);
    await screen.findByText('Supplier 1');
    expect([...screen.getAllByRole('columnheader')].map((h) => h.textContent)).toEqual(
      ['Nama Supplier', 'Bank', 'NPWP', 'Pajak', 'PIC', 'Kontak', 'Alamat', 'Aksi'],
    );
    expect(screen.queryByLabelText('Filter pajak')).toBeNull();
    expect(screen.queryByText('Mode Edit')).toBeNull();
  });

  it('shows the PIC column and a dash when the supplier has no PIC', async () => {
    installFakeApi({
      'GET /api/v1/suppliers': paged([{ ...supplier(1), pic: 'Budi' }, supplier(2)]),
    });
    render(<DataSupplier />);
    await screen.findByText('Supplier 1');
    const row1 = screen.getByText('Supplier 1').closest('tr')!;
    const row2 = screen.getByText('Supplier 2').closest('tr')!;
    expect(row1.querySelectorAll('td')[4].textContent).toBe('Budi');
    expect(row2.querySelectorAll('td')[4].textContent).toBe('-');
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
