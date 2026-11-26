import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { fail, installFakeApi, paged, type FakeRequest } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import PemutihanStokPpic from './PemutihanStokPpic';
import PemutihanStokGudang from './PemutihanStokGudang';
import PemutihanStokDetail from './PemutihanStokDetail';
import PemutihanStokForm from './PemutihanStokForm';

const nav = vi.hoisted(() => ({ id: undefined as string | undefined, pathname: '/dashboard/ppic/transaksi/pemutihan-stok', push: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useParams: () => ({ id: nav.id }),
  useRouter: () => ({ push: nav.push }),
}));
beforeEach(() => { nav.id = undefined; nav.pathname = '/dashboard/ppic/transaksi/pemutihan-stok'; nav.push.mockClear(); });

const row = (id: number, status: 'DRAFT' | 'POSTED') => ({ id, month: 11, year: 2026, status, lineCount: 2 });
const line = {
  itemId: 1, itemCode: 'B-1', itemName: 'Triplex', unit: 'lbr', category: 'Lembaran',
  systemQty: null, physicalQty: 8, difference: -2, unitPrice: 1000, reviewedSystemQty: 10, note: 'rak A',
};
const draft = { ...row(5, 'DRAFT'), notes: null, lines: [line] };
const posted = { ...row(5, 'POSTED'), postedBy: 3, postedByName: 'PPIC', postedAt: '2026-11-26T08:00:00Z', lines: [{ ...line, systemQty: 10, difference: 0 }] };
const ppicPerms = ['stock-reconciliation.view', 'stock-reconciliation.create', 'stock-reconciliation.post'];

describe('pemutihan stok', () => {
  it('PPIC sees draft and posted rows with a create button; Gudang only sees posted rows', async () => {
    installFakeApi({ 'GET /api/v1/stock-reconciliations': paged([row(5, 'DRAFT'), row(6, 'POSTED')]) });
    const { unmount } = render(withUser(<PemutihanStokPpic />, ppicPerms));
    expect(await screen.findByRole('link', { name: /Buat Pemutihan/ })).not.toBeNull();
    expect(screen.getAllByText('Pemutihan November 2026')).toHaveLength(2);
    expect(screen.getByText('Draft')).not.toBeNull();
    unmount();

    nav.pathname = '/dashboard/gudang/transaksi/pemutihan-stok';
    render(withUser(<PemutihanStokGudang />, ['stock-reconciliation.view']));
    await screen.findByText('Diposting');
    expect(screen.queryByText('Draft')).toBeNull();
    expect(screen.queryByRole('link', { name: /Buat Pemutihan/ })).toBeNull();
  });

  it('creates a draft from suggestions with an Idempotency-Key', async () => {
    nav.id = undefined;
    const api = installFakeApi({
      'GET /api/v1/stock-reconciliations/suggestions': [line],
      'POST /api/v1/stock-reconciliations': { ...draft, id: 9 },
    });
    render(withUser(<PemutihanStokForm />, ppicPerms));
    fireEvent.click(await screen.findByRole('button', { name: 'Muat Saran' }));
    expect(await screen.findByLabelText('Jumlah fisik Triplex')).toHaveProperty('value', '8');
    fireEvent.change(screen.getByLabelText('Jumlah fisik Triplex'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Draft' }));
    await waitFor(() => expect(api.calls('POST /api/v1/stock-reconciliations')).toHaveLength(1));
    const call = api.calls('POST /api/v1/stock-reconciliations')[0];
    expect(call.headers.get('Idempotency-Key')).toBeTruthy();
    expect(call.body).toMatchObject({ lines: [{ itemId: 1, physicalQty: 7 }] });
    expect(nav.push).toHaveBeenCalledWith('/dashboard/ppic/transaksi/pemutihan-stok/9');
  });

  it('shows reviewedSystemQty on a draft and posts once with an Idempotency-Key', async () => {
    nav.id = '5';
    nav.pathname = '/dashboard/ppic/transaksi/pemutihan-stok/5';
    const api = installFakeApi({
      'GET /api/v1/stock-reconciliations/5': draft,
      'POST /api/v1/stock-reconciliations/5/post': (req: FakeRequest) => ({ ...posted, key: req.headers.get('Idempotency-Key') }),
    });
    render(withUser(<PemutihanStokDetail />, ppicPerms));
    expect(await screen.findByText('10')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Posting Pemutihan' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Ya, Posting' }));
    await waitFor(() => expect(api.calls('POST /api/v1/stock-reconciliations/5/post')).toHaveLength(1));
    expect(api.calls('POST /api/v1/stock-reconciliations/5/post')[0].headers.get('Idempotency-Key')).toBeTruthy();
    expect(await screen.findByText(/Diposting oleh PPIC/)).not.toBeNull();
  });

  it('Gudang gets a friendly 404 for a draft and cannot post', async () => {
    nav.id = '5';
    nav.pathname = '/dashboard/gudang/transaksi/pemutihan-stok/5';
    installFakeApi({ 'GET /api/v1/stock-reconciliations/5': fail(404, 'Pemutihan tidak ditemukan') });
    render(withUser(<PemutihanStokDetail />, ['stock-reconciliation.view']));
    expect(await screen.findByText('Pemutihan tidak ditemukan')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Posting Pemutihan' })).toBeNull();
  });
});
