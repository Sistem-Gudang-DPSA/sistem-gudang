import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import SpkInternal from './SpkInternal';

const line = (id: number, status: 'BUFFER' | 'LOCKED', totalStock: number, bisa: number) => ({
  id, spkInternalId: id, noSpk: `SPKI-${id}`, tanggalTerbit: '2026-05-01', tujuanProduksi: 'STOCK', spkKlienInduk: 'SPK-1',
  penanggungJawab: 'Budi', targetSelesai: '2026-06-01', catatan: null, sku: `SKU-${id}`, namaBarang: `Barang ${id}`,
  periode: '2026-05', totalQty: totalStock, alokasiSpkKlien: 0, alokasiStokBebas: bisa, totalStock, totalBisaPakai: bisa, status,
});
const rows = [line(1, 'BUFFER', 10, 6), line(2, 'LOCKED', 4, 0), line(3, 'BUFFER', 5, 5)];

describe('SpkInternal list', () => {
  it('renders rows, summary and per-status actions', async () => {
    const api = installFakeApi({ 'GET /api/v1/spk-internal': paged(rows) });
    render(<SpkInternal />);
    expect(await screen.findByText('SPKI-1')).toBeTruthy();
    expect(api.calls('GET /api/v1/spk-internal')[0].query.get('pageSize')).toBe('100');
    expect(screen.getByText('SKU-1 - Barang 1')).toBeTruthy();
    expect(screen.getByText('15 pcs')).toBeTruthy(); // buffer stock 10+5
    expect(screen.getByText('11 pcs (Siap Pakai)')).toBeTruthy();
    expect(screen.getByText('4 pcs (Locked)')).toBeTruthy();
    expect(screen.getAllByText('BUFFER', { selector: 'button' })).toHaveLength(2);
    expect(screen.getAllByText('LOCKED', { selector: 'button' })).toHaveLength(1);
    expect(screen.getAllByText('DETAIL').map((a) => a.closest('a')?.getAttribute('href'))).toEqual([1, 2, 3].map((i) => `/dashboard/ppic/transaksi/spk-mutasi-internal/alokasi-barang/${i}`));
    expect(screen.getByText('Buat SPK Internal').closest('a')?.getAttribute('href')).toBe('/dashboard/ppic/transaksi/spk-mutasi-internal/buat-spk');
  });

  it('empty state', async () => {
    installFakeApi({ 'GET /api/v1/spk-internal': paged([]) });
    render(<SpkInternal />);
    expect(await screen.findByText('Data tidak ditemukan.')).toBeTruthy();
  });

  it('backend error', async () => {
    installFakeApi({ 'GET /api/v1/spk-internal': fail(500, 'Database mati') });
    render(<SpkInternal />);
    expect(await screen.findByText('Database mati')).toBeTruthy();
  });

  it('sends search and status filters to the API', async () => {
    const api = installFakeApi({ 'GET /api/v1/spk-internal': paged(rows) });
    render(<SpkInternal />);
    await screen.findByText('SPKI-1');
    const box = screen.getByLabelText('Cari kode barang') as HTMLInputElement;
    expect(box.maxLength).toBe(100);
    fireEvent.change(box, { target: { value: 'SKU-2' } });
    await waitFor(() => expect(api.calls('GET /api/v1/spk-internal').some((c) => c.query.get('search') === 'SKU-2')).toBe(true));
    fireEvent.change(screen.getByLabelText('Status :'), { target: { value: 'LOCKED' } });
    await waitFor(() => expect(api.calls('GET /api/v1/spk-internal').some((c) => c.query.get('status') === 'LOCKED' && c.query.get('search') === 'SKU-2')).toBe(true));
  });
});
