import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi } from '@/test/fake-api';
import LaporanBarangKeluar from './LaporanBarangKeluar';
import LaporanBarangMasuk from './LaporanBarangMasuk';

const print = vi.hoisted(() => ({ cetakHtml: vi.fn(async () => {}) }));
vi.mock('@/shared/lib/print-html', () => print);

afterEach(() => { vi.unstubAllGlobals(); print.cetakHtml.mockClear(); });

const line = (qty: number) => ({ itemId: 1, itemCode: 'B-1', itemName: 'Triplex', qty, pic: 'Andi', locationCode: null });
const keluar = (id: number, qtys: number[]) => ({
  id, date: '2026-03-05T00:00:00.000Z', clientName: `Klien ${id}`, spk: `SPK-${id}`, itemName: 'P', warehouseType: 'BAHAN_BAKU',
  recipientType: 'PRODUKSI', notes: null, createdBy: 1, createdAt: '2026-03-05T00:00:00.000Z', lines: qtys.map(line),
});
const masuk = (id: number, source: string, qty: number) => ({
  id, date: '2026-03-05T00:00:00.000Z', itemId: 1, itemCode: 'B-1', itemName: 'Triplex', locationCode: null, supplierId: null,
  supplierName: 'PT A', source, qtyArrived: qty, qtyPurchased: null, statusQc: 'PASS', referenceNo: `PO-${id}`, supplierDeliveryNo: null,
  clientName: null, spk: null, notes: null, createdBy: 1, createdAt: '2026-03-05T00:00:00.000Z', cancelledAt: null, cancelledByName: null, cancelReason: null,
});

describe('Laporan Barang Keluar', () => {
  it('kartu memakai total terfilter dan PDF menjumlah baris yang dicetak', async () => {
    installFakeApi({
      'GET /api/v1/reports/outbound': {
        rows: [keluar(1, [3, 4]), keluar(2, [5])], total: 2, page: 1, pageSize: 20,
        summary: { bahanBaku: 20, wip: 0, barangJadi: 0 },
      },
    });
    render(<LaporanBarangKeluar />);
    await screen.findAllByText('SPK-1');
    expect(screen.getByText('2 Transaksi')).toBeTruthy();
    expect(screen.queryByText('20 Transaksi')).toBeNull();
    fireEvent.click(screen.getByTitle('Print'));
    await waitFor(() => expect(print.cetakHtml).toHaveBeenCalled());
    const html = (print.cetakHtml.mock.calls[0] as unknown as [string])[0];
    expect(html).toContain('2 Transaksi / 12 Qty');
  });
});

describe('Laporan Barang Masuk', () => {
  it('PDF menjumlah baris halaman, bukan summary global', async () => {
    const summary = { total: 99, supplier: 90, produksi: 9, klien: 0, qtyTotal: 999, qtySupplier: 900, qtyProduksi: 99, qtyKlien: 0 };
    installFakeApi({
      'GET /api/v1/reports/inbound': {
        rows: [masuk(1, 'SUPPLIER', 10), masuk(2, 'SUPPLIER', 5), masuk(3, 'PRODUKSI', 7)], total: 3, page: 1, pageSize: 20, summary,
      },
    });
    render(<LaporanBarangMasuk />);
    await screen.findByText('PO-1');
    expect(screen.getByText(/999 Qty/)).toBeTruthy(); // kartu tetap ringkasan semua sumber
    fireEvent.click(screen.getByTitle('Print'));
    await waitFor(() => expect(print.cetakHtml).toHaveBeenCalled());
    const html = (print.cetakHtml.mock.calls[0] as unknown as [string])[0];
    expect(html).toContain('22 Qty / 3 Transaksi');
    expect(html).toContain('15 Qty (2 Transaksi)');
    expect(html).toContain('7 Qty (1 Transaksi)');
    expect(html).not.toContain('999 Qty');
  });
});
