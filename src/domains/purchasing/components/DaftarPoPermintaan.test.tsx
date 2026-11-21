import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthUserProvider } from '@/domains/auth/user-context';
import { installFakeApi, paged } from '@/test/fake-api';
import DaftarPoPermintaan from './DaftarPoPermintaan';
import type { PermintaanPembelian } from '@/domains/ppic/data/pembelian';

const permintaan = (purchaseStatus?: PermintaanPembelian['purchaseStatus']): PermintaanPembelian => ({
  id: 7, tanggal: '2026-03-01', permintaan: 'P', status: 'Disetujui', statusApi: 'approved',
  bagian: 'PPIC', nama: 'Budi', jabatan: 'Staff', barang: [], purchaseStatus,
});

const po = {
  id: 5, nomorPo: 'PO-005', approvalRequestId: 7, tanggalPo: '2026-03-10', supplierId: 3, supplierName: 'PT Kayu',
  picSupplier: 'Andi', dppLain: 0, persenPpn: 12, jasa: 0, subtotal: 1_000_000, nilaiPpn: 0, grandTotal: 1_100_000,
  createdBy: 1, createdAt: '2026-03-10T00:00:00Z', status: 'ISSUED', cancelledAt: null, cancelledBy: null, cancelReason: null, barang: [],
} as const;

const routes = {
  'GET /api/v1/purchase-orders': paged([po]),
  'GET /api/v1/purchase-orders/5': po,
};

describe('daftar PO permintaan', () => {
  it('menampilkan PO milik permintaan dan progres pembelian', async () => {
    installFakeApi(routes);
    render(<DaftarPoPermintaan permintaan={permintaan('PARTIALLY_PURCHASED')} />);
    expect(await screen.findByText('PO-005')).not.toBeNull();
    expect(screen.getByText('PO-005').getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang/detail-po/5');
    expect(screen.getByText('PT Kayu')).not.toBeNull();
    expect(screen.getByText('Rp. 1.100.000')).not.toBeNull();
    expect(screen.getByText('Sebagian dipesan')).not.toBeNull();
  });

  it('mengirim filter approvalRequestId dan mengabaikan PO batal', async () => {
    const api = installFakeApi({
      'GET /api/v1/purchase-orders': paged([po, { ...po, id: 6, nomorPo: 'PO-006', status: 'CANCELLED' }]),
      'GET /api/v1/purchase-orders/5': po,
      'GET /api/v1/purchase-orders/6': { ...po, id: 6, nomorPo: 'PO-006', status: 'CANCELLED' },
    });
    render(<DaftarPoPermintaan permintaan={permintaan()} />);
    await screen.findByText('PO-005');
    expect(api.calls('GET /api/v1/purchase-orders')[0].query.get('approvalRequestId')).toBe('7');
    expect(screen.queryByText('PO-006')).toBeNull();
  });

  it('menampilkan pesan kosong dan disembunyikan tanpa izin PO', async () => {
    installFakeApi({ 'GET /api/v1/purchase-orders': paged([]) });
    const { unmount } = render(<DaftarPoPermintaan permintaan={permintaan()} />);
    expect(await screen.findByText('Belum ada PO untuk permintaan ini.')).not.toBeNull();
    unmount();

    render(
      <AuthUserProvider user={{ id: 1, username: 'p', email: 'p@example.test', roleId: 2, roleName: 'Purchasing', isSuperadmin: false, permissions: ['purchase-request.approve'] }}>
        <DaftarPoPermintaan permintaan={permintaan()} />
      </AuthUserProvider>,
    );
    expect(screen.queryByText('Purchase Order')).toBeNull();
  });
});
