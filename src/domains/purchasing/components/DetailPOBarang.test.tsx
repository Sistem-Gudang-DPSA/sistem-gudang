import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DetailPOBarang from '@/app/dashboard/purchasing/transaksi/buat-po-barang/detail-po/[id]/page';
import { installFakeApi, fail } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import type { PurchaseOrder } from '@/domains/purchasing/types';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '54' }) }));

const po: PurchaseOrder = {
  id: 54, nomorPo: 'PO-054', approvalRequestId: null, tanggalPo: '2026-11-14',
  supplierId: 540, supplierName: 'Jaya Kusuma', picSupplier: 'Rina / 081200000540',
  supplierAddress: 'Jl Banjeng', supplierPhone: '0383989383', supplierNpwp: '023973838', supplierBank: 'Bank Indonesia',
  dppLain: 1833, persenPpn: 12, jasa: 0,
  subtotal: 2000, nilaiPpn: 220, grandTotal: 2220, createdBy: 1, createdAt: '2026-11-14T00:00:00Z',
  status: 'ISSUED', submittedAt: '2026-11-14T08:00:00Z', submittedBy: 1, cancelledAt: null, cancelledBy: null, cancelReason: null,
  barang: [{ id: 5401, kodeBarang: 'b01-tri4-jk-001', namaBarang: 'Triplex 4mm', satuan: 'Lembar', noSpk: 'SPK-9', jumlah: 1, qtyReceived: 1, sisa: 0, hargaSatuan: 2000, diskon: 0, receipts: [] }],
};

describe('Detail PO Barang', () => {
  it('loads the saved PO by its ID and shows read-only contents and server totals', async () => {
    const api = installFakeApi({ 'GET /api/v1/purchase-orders/54': po });
    render(withUser(<DetailPOBarang />, ['purchase-order.view']));
    expect(screen.getByRole('status').textContent).toBe('Memuat detail PO...');
    await screen.findByText('PO-054');
    expect(screen.getAllByText('14/11/2026').length).toBeGreaterThanOrEqual(2);
    const supplierTable = screen.getByRole('table', { name: 'Data supplier PO' });
    const pemesanTable = screen.getByRole('table', { name: 'Data pemesan PO' });
    expect(within(supplierTable).getByRole('row', { name: 'Nama Perusahaan Jaya Kusuma' })).toBeTruthy();
    expect(within(supplierTable).getByText('Jl Banjeng / 0383989383')).toBeTruthy();
    expect(within(supplierTable).getByText('023973838')).toBeTruthy();
    expect(within(supplierTable).getByText('Bank Indonesia')).toBeTruthy();
    expect(within(pemesanTable).getByText('SPK-9')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tujuan Pemesanan (Supplier)' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pemesan' })).toBeTruthy();
    expect(screen.getByText('Rina / 081200000540')).toBeTruthy();
    const row = screen.getByRole('row', { name: /b01-tri4-jk-001/ });
    expect(within(row).getByText('Triplex 4mm')).toBeTruthy();
    expect(within(row).getByText('Lembar')).toBeTruthy();
    expect(within(row).getByText('SPK-9')).toBeTruthy();
    expect(within(row).getByText('0')).toBeTruthy();
    expect(within(row).getByText('Rp. 0')).toBeTruthy();
    expect(screen.getByText('Grand Total').parentElement?.textContent).toContain('Rp. 2.220');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Lihat Permintaan Pembelian Asal' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Kembali ke PO Barang' }).getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang');
    expect(api.calls('GET /api/v1/purchase-orders/54')).toHaveLength(1);
    expect(api.calls('GET /api/v1/approvals/54')).toHaveLength(0);
    expect(api.calls('GET /api/v1/suppliers')).toHaveLength(0);
  });

  it.each([false, true])('guards the original request link with approval permission=%s', async (canReview) => {
    installFakeApi({ 'GET /api/v1/purchase-orders/54': { ...po, approvalRequestId: 9 } });
    render(withUser(<DetailPOBarang />, ['purchase-order.view', ...(canReview ? ['purchase-request.approve'] : [])]));
    await screen.findByText('PO-054');
    const link = screen.queryByRole('link', { name: 'Lihat Permintaan Pembelian Asal' });
    expect(!!link).toBe(canReview);
    if (link) expect(link.getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang/permintaan-pembelian/9');
  });

  it('does not fetch PO data without purchase-order.view', async () => {
    const api = installFakeApi({});
    render(withUser(<DetailPOBarang />, ['purchase-order.create']));
    expect(screen.getByRole('alert').textContent).toBe('Anda tidak memiliki izin untuk melihat PO Barang.');
    expect(api.calls('GET /api/v1/purchase-orders/54')).toHaveLength(0);
  });

  it('shows missing PO errors and keeps the list navigation available', async () => {
    installFakeApi({ 'GET /api/v1/purchase-orders/54': fail(404, 'PO tidak ditemukan') });
    render(withUser(<DetailPOBarang />, ['purchase-order.view']));
    expect((await screen.findByRole('alert')).textContent).toBe('PO tidak ditemukan');
    expect(screen.getByRole('link', { name: 'Kembali ke PO Barang' })).toBeTruthy();
  });

  it('shows a draft notice and an edit link for a draft PO with update permission', async () => {
    installFakeApi({ 'GET /api/v1/purchase-orders/54': { ...po, status: 'DRAFT', submittedAt: null, submittedBy: null } });
    render(withUser(<DetailPOBarang />, ['purchase-order.view', 'purchase-order.update']));
    await screen.findByText('DRAFT');
    expect(screen.getByText(/PO masih berupa draf/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Edit Draft PO' }).getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang/edit-po/54');
  });

  it('shows cancellation details for cancelled POs', async () => {
    installFakeApi({ 'GET /api/v1/purchase-orders/54': { ...po, status: 'CANCELLED', cancelReason: 'Pesanan dibatalkan' } });
    render(withUser(<DetailPOBarang />, ['purchase-order.view']));
    await screen.findByText('CANCELLED');
    expect(screen.getByText('Alasan Pembatalan: Pesanan dibatalkan')).toBeTruthy();
  });
});
