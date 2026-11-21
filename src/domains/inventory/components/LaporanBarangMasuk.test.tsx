import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi } from '@/test/fake-api';
import LaporanBarangMasuk from './LaporanBarangMasuk';

const nav = vi.hoisted(() => ({ pathname: '/dashboard/gudang/laporan/barang-masuk' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => nav.pathname,
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

describe.each(['/dashboard/gudang'])('Filter sumber inbound %s', (base) => {
  it('menyembunyikan pilihan sumber dan tetap memuat semua sumber dengan filter tanggal', async () => {
    nav.pathname = `${base}/laporan/barang-masuk`;
    const api = installFakeApi({ 'GET /api/v1/reports/inbound': { rows: [], total: 0, page: 1, pageSize: 20, summary } });
    const { container } = render(<LaporanBarangMasuk />);
    await screen.findByText('50 Qty / 5 Transaksi');
    expect(screen.queryByText('Sumber Inbound')).toBeNull();
    expect(screen.queryByText('Semua Sumber (Supplier / Produksi)')).toBeNull();
    expect(api.calls('GET /api/v1/reports/inbound')[0].query.has('source')).toBe(false);
    expect(screen.getByText('Periode Tanggal')).not.toBeNull();
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2026-10-15' } });
    await waitFor(() => expect(api.calls('GET /api/v1/reports/inbound').at(-1)!.query.get('startDate')).toBe('2026-10-15'));
    expect(api.calls('GET /api/v1/reports/inbound').at(-1)!.query.has('source')).toBe(false);
  });
});

it.each(['/dashboard/gudang-barang-jadi', '/dashboard/purchasing'])('%s tetap menyediakan filter sumber inbound', async (base) => {
  nav.pathname = `${base}/laporan/barang-masuk`;
  const api = installFakeApi({ 'GET /api/v1/reports/inbound': { rows: [], total: 0, page: 1, pageSize: 20, summary } });
  render(<LaporanBarangMasuk />);
  await screen.findByText('50 Qty / 5 Transaksi');
  fireEvent.change(screen.getByDisplayValue('Semua Sumber (Supplier / Produksi)'), { target: { value: 'SUPPLIER' } });
  await waitFor(() => expect(api.calls('GET /api/v1/reports/inbound').at(-1)!.query.get('source')).toBe('SUPPLIER'));
});
