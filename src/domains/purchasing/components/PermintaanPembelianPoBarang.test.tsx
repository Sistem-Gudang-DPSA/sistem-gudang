import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';
import Page from '@/app/dashboard/purchasing/transaksi/buat-po-barang/permintaan-pembelian/[id]/page';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '7' }), useRouter: () => ({ push: vi.fn() }) }));

const request = (status: string) => ({
  request: {
    id: 7, type: 'purchase-request', requestedBy: 1, requestedByDomainId: 1, currentStepOrder: 1, cycle: 1, status, createdAt: '2026-03-01T00:00:00Z',
    payload: {
      bagian: 'Produksi', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-03-05',
      items: [{ namaBarang: 'Triplex', qty: 10, satuan: 'lbr', proyek: 'Proyek A', noSpk: 'SPK-1' }],
    },
  },
  actions: [],
});

const purchasing = (permissions: string[]): AuthUser => ({
  id: 1, username: 'p', email: 'p@example.test', roleId: 4, roleName: 'Staf Purchasing',
  isSuperadmin: false, domainCode: 'purchasing', permissions,
});

describe('detail permintaan yang dibuka dari PO Barang', () => {
  it('memakai judul umum, kembali ke daftar PO Barang, dan tetap menampilkan status tanpa izin approve', async () => {
    installFakeApi({ 'GET /api/v1/approvals/7': request('pending'), 'GET /api/v1/purchase-orders': paged([]) });
    render(<AuthUserProvider user={purchasing(['purchase-order.create'])}><Page /></AuthUserProvider>);

    expect(await screen.findByRole('heading', { name: 'Permintaan Pembelian' })).toBeTruthy();
    expect(screen.getByLabelText('Kembali').getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang');
    expect(screen.getByText('Belum Disetujui')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Setuju' })).toBeNull();
  });

  it('meneruskan asal PO Barang ke form Buat PO', async () => {
    installFakeApi({ 'GET /api/v1/approvals/7': request('approved'), 'GET /api/v1/purchase-orders': paged([]) });
    render(<AuthUserProvider user={purchasing(['purchase-order.create'])}><Page /></AuthUserProvider>);

    const link = await screen.findByText('Buat PO');
    expect(link.getAttribute('href')).toBe('/dashboard/purchasing/transaksi/buat-po-barang/buat-po/7?from=permintaan-po-barang');
  });

  it('menampilkan status disetujui tanpa tombol Buat PO saat pengguna hanya punya purchase-order.view', async () => {
    installFakeApi({ 'GET /api/v1/approvals/7': request('approved'), 'GET /api/v1/purchase-orders': paged([]) });
    render(<AuthUserProvider user={purchasing(['purchase-order.view'])}><Page /></AuthUserProvider>);

    expect(await screen.findByText('Disetujui')).toBeTruthy();
    expect(screen.queryByText('Buat PO')).toBeNull();
  });
});
