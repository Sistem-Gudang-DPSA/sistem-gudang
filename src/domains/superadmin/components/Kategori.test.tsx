import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import Kategori from './Kategori';

const item = (id: number, category: string, stock: number) => ({ id, code: null, name: `Barang ${id}`, category, unit: 'pcs', price: 0, stock, locationId: null, supplierId: 1, locationCode: null, supplierName: 'S' });
const rowOf = (name: string) => screen.getByText(name, { selector: 'span' }).closest('tr')!;

describe('Kategori', () => {
  it('groups items by category with item count and total stock, across pages', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => item(i + 1, 'Kayu', 1));
    const api = installFakeApi({
      'GET /api/v1/items': (req: { query: URLSearchParams }) =>
        req.query.get('page') === '1'
          ? paged(page1, { total: 102 })
          : paged([item(101, 'Cat', 5), item(102, '', 2)], { total: 102, page: 2 }),
    });
    render(<Kategori />);

    expect((await screen.findByText('Kayu', { selector: 'span' })).closest('tr')!.textContent).toContain('100');
    expect(rowOf('Cat').textContent).toContain('5');
    expect(rowOf('Tanpa Kategori').textContent).toContain('2');
    expect(screen.getByText('3 kategori')).not.toBeNull();
    expect(api.calls('GET /api/v1/items').map((c) => c.query.get('page'))).toEqual(['1', '2']);
  });

  it('filters categories by search text', async () => {
    installFakeApi({ 'GET /api/v1/items': paged([item(1, 'Kayu', 1), item(2, 'Cat', 1)]) });
    render(<Kategori />);
    await screen.findByText('Kayu', { selector: 'span' });
    fireEvent.change(screen.getByPlaceholderText('Cari kategori...'), { target: { value: 'ca' } });
    expect(screen.queryByText('Kayu', { selector: 'span' })).toBeNull();
    expect(screen.getByText('Cat', { selector: 'span' })).not.toBeNull();
  });

  it('shows the API error', async () => {
    installFakeApi({ 'GET /api/v1/items': fail(500, 'Server error') });
    render(<Kategori />);
    expect(await screen.findByText('Server error')).not.toBeNull();
  });
});
