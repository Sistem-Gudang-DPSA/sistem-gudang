import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import DataBarang from './DataBarang';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/keuangan/barang',
}));

const item = (id: number, over = {}) => ({ id, code: `BRG-${id}`, externalCode: null, name: `Barang ${id}`, supplierId: 7, stock: 30, unit: 'pcs', category: 'Lembaran', locationId: 1, price: 1000, ...over });

describe('Keuangan DataBarang export', () => {
  it('exports every filtered row across pages as an escaped CSV', async () => {
    const csv = await import('@/shared/lib/csv');
    const spy = vi.spyOn(csv, 'downloadCsv').mockImplementation(() => {});
    const all = Array.from({ length: 25 }, (_, i) => item(i + 1, i === 0 ? { externalCode: '=Meja, "besar"' } : {}));
    const api = installFakeApi({
      'GET /api/v1/items': (req: { query: URLSearchParams }) => {
        const pageSize = Number(req.query.get('pageSize'));
        const page = Number(req.query.get('page'));
        return { rows: all.slice((page - 1) * pageSize, page * pageSize), total: 25, page, pageSize };
      },
      'GET /api/v1/locations': paged([{ id: 1, code: 'A01', rackName: 'A', rackNumber: '01' }]),
      'GET /api/v1/suppliers': paged([{ id: 7, name: 'PT Kayu' }]),
    });
    render(<DataBarang />);
    await screen.findByText('Barang 1');
    await waitFor(() => expect(api.calls('GET /api/v1/locations').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByTitle('Export Excel'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const [name, rows] = spy.mock.calls[0];
    expect(name).toBe('Data_Barang_Keuangan.csv');
    expect(rows).toHaveLength(26);
    expect(csv.toCsv(rows)).toContain("\"'=Meja, \"\"besar\"\"\"");
    spy.mockRestore();
  });
});
