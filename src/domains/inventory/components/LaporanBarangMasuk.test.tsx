import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { installFakeApi } from '@/test/fake-api';
import LaporanBarangMasuk from './LaporanBarangMasuk';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/gudang/laporan-barang-masuk',
}));

const summary = { total: 5, supplier: 3, produksi: 1, klien: 1, qtyTotal: 50, qtySupplier: 30, qtyProduksi: 10, qtyKlien: 10 };
const filteredSummary = { total: 1, supplier: 0, produksi: 0, klien: 1, qtyTotal: 10, qtySupplier: 0, qtyProduksi: 0, qtyKlien: 10 };

describe('LaporanBarangMasuk', () => {
  it('total card follows filteredSummary, category cards keep summary', async () => {
    installFakeApi({ 'GET /api/v1/reports/inbound': { rows: [], total: 0, page: 1, pageSize: 20, summary, filteredSummary } });
    render(<LaporanBarangMasuk />);
    await screen.findByText('10 Qty / 1 Transaksi');
    expect(screen.getByText('30 Qty (3 Transaksi)')).toBeTruthy();
  });

  it('falls back to summary when filteredSummary is absent', async () => {
    installFakeApi({ 'GET /api/v1/reports/inbound': { rows: [], total: 0, page: 1, pageSize: 20, summary } });
    render(<LaporanBarangMasuk />);
    await screen.findByText('50 Qty / 5 Transaksi');
  });
});
