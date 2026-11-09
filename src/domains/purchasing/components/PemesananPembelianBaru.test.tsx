import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import PemesananPembelianBaru from './PemesananPembelianBaru';

vi.mock('next/navigation', () => ({ useParams: () => ({}), useRouter: () => ({ push: vi.fn() }), usePathname: () => '/' }));

const suppliers = paged([{ id: 3, code: 'S3', name: 'PT Kayu', bank: '-', npwp: '-', phone: '1', address: 'Jl', pajak: 'PKP' }]);

describe('PemesananPembelianBaru', () => {
  it('PPN accepts decimals with comma or dot, stored with a dot', () => {
    installFakeApi({ 'GET /api/v1/suppliers': suppliers });
    render(<PemesananPembelianBaru />);
    const ppn = screen.getByLabelText('PPN (%)') as HTMLInputElement;
    fireEvent.change(ppn, { target: { value: '11,5' } });
    expect(ppn.value).toBe('11.5');
  });

  it('searches items on the server filtered by the chosen supplier', async () => {
    const api = installFakeApi({ 'GET /api/v1/suppliers': suppliers, 'GET /api/v1/items': paged([]) });
    render(<PemesananPembelianBaru />);
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(await screen.findByText('PT Kayu'));
    await vi.waitFor(() => expect(api.calls('GET /api/v1/items').some((c) => c.query.get('supplierId') === '3')).toBe(true));
  });

  it('keeps the supplier when it is re-selected after the search results moved on', async () => {
    let list = suppliers;
    installFakeApi({ 'GET /api/v1/suppliers': () => list, 'GET /api/v1/items': paged([]) });
    render(<PemesananPembelianBaru />);
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(await screen.findByRole('option', { name: 'PT Kayu' }));
    list = paged([]);
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.change(screen.getByLabelText('Cari Data Supplier'), { target: { value: 'zzz' } });
    await vi.waitFor(() => expect(screen.getByRole('option', { name: 'PT Kayu' })).toBeTruthy());
    fireEvent.click(screen.getByRole('option', { name: 'PT Kayu' }));
    expect(screen.getByLabelText('Data Supplier').textContent).toBe('PT Kayu');
  });
});
