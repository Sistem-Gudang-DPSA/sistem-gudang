import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';
import Page from '@/app/dashboard/purchasing/transaksi/buat-po-barang/permintaan-pembelian/[id]/page';

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: '7' }), useRouter: () => ({ push: nav.push }) }));

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

  it('meneruskan asal PO Barang ke form PO setelah Generate PO', async () => {
    installFakeApi({
      'GET /api/v1/approvals/7': request('approved'),
      'GET /api/v1/approvals/7/mapping': { approvalRequestId: 7, status: 'NOT_STARTED', lines: [] },
      'GET /api/v1/purchase-orders': paged([]),
      'GET /api/v1/suppliers': paged([{ id: 3, code: 'S3', name: 'PT Kayu' }]),
      'GET /api/v1/suppliers/3': { id: 3, code: 'S3', name: 'PT Kayu', address: '', phone: '', bank: '', npwp: '', pajak: 'PKP' },
      'PUT /api/v1/approvals/7/mapping': {},
    });
    render(<AuthUserProvider user={purchasing(['purchase-order.create', 'purchase-order.view'])}><Page /></AuthUserProvider>);

    fireEvent.click(await screen.findByLabelText('Supplier baris 1 supplier 1'));
    fireEvent.click(await screen.findByRole('option', { name: 'S3 - PT Kayu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate PO' }));
    await waitFor(() => expect(nav.push).toHaveBeenCalled());
    const target = new URL(nav.push.mock.calls.at(-1)![0], 'http://localhost');
    expect(target.pathname).toBe('/dashboard/purchasing/transaksi/buat-po-barang/buat-po/7');
    expect(target.searchParams.get('from')).toBe('permintaan-po-barang');
    expect(target.searchParams.get('draft')).toBeTruthy();
  });

  it('menampilkan status disetujui tanpa tombol Generate PO saat pengguna hanya punya purchase-order.view', async () => {
    installFakeApi({ 'GET /api/v1/approvals/7': request('approved'), 'GET /api/v1/approvals/7/mapping': { approvalRequestId: 7, status: 'NOT_STARTED', lines: [] }, 'GET /api/v1/purchase-orders': paged([]) });
    render(<AuthUserProvider user={purchasing(['purchase-order.view'])}><Page /></AuthUserProvider>);

    expect(await screen.findByText('Disetujui')).toBeTruthy();
    expect(screen.queryByText('Generate PO')).toBeNull();
  });
});
