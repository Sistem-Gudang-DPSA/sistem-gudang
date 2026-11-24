import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { withUser } from '@/test/as-user';
import Inbox from './DaftarPermintaanPembelian';
import Tinjau from './TinjauPermintaanPembelian';
import Purchasing from '@/domains/purchasing/components/PermintaanPembelian';
import TambahPpic from '@/app/dashboard/ppic/transaksi/permintaan-pembelian/tambah/page';

const nav = vi.hoisted(() => ({ redirect: vi.fn((path: string): never => { throw new Error(`Redirect:${path}`); }) }));
vi.mock('next/navigation', () => ({ useParams: () => ({ id: '7' }), useRouter: () => ({ push: vi.fn() }), usePathname: () => '/dashboard/ppic/transaksi/permintaan-pembelian', redirect: nav.redirect }));
const row = (step = 2, status = 'pending') => ({
  id: 7, type: 'purchase-request', requestedBy: 12, requestedByDomainId: 1, currentStepOrder: step, cycle: 1, status, createdAt: '2026-11-23T00:00:00Z',
  payload: { bagian: 'Gudang', namaPemohon: 'imel', jabatan: 'Staff', tanggalPengajuan: '2026-11-23', items: [{ namaBarang: 'Triplex', qty: 2, satuan: 'Lbr', proyek: 'PT MAJU JAYA' }] },
});

it('PPIC sees incoming requests with review links and no new-request or requester editing actions', async () => {
  installFakeApi({ 'GET /api/v1/approvals': paged([row()]) });
  render(withUser(<Inbox />, ['purchase-request.approve', 'purchase-request.create']));
  expect(await screen.findByText('Menunggu PPIC')).not.toBeNull();
  expect(screen.getByText('imel')).not.toBeNull();
  expect(screen.getByRole('link', { name: 'Tinjau Permintaan' }).getAttribute('href')).toBe('/dashboard/ppic/transaksi/permintaan-pembelian/7');
  expect(screen.queryByRole('link', { name: 'Ajukan Permintaan Pembelian' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Batalkan' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Cetak' })).not.toBeNull();
});

it('redirects the old PPIC create URL to its review list', () => {
  expect(() => TambahPpic()).toThrow('Redirect:/dashboard/ppic/transaksi/permintaan-pembelian');
});

it('PPIC approval advances to Purchasing without approving the whole request or showing PO creation', async () => {
  let current = row();
  const api = installFakeApi({
    'GET /api/v1/approvals/7': () => ({ request: current, actions: [] }),
    'POST /api/v1/approvals/7/approve': () => { current = row(3); return null; },
  });
  render(withUser(<Tinjau />, ['purchase-request.approve']));
  fireEvent.click(await screen.findByRole('button', { name: 'Setuju' }));
  expect(await screen.findByText('Menunggu persetujuan Purchasing.')).not.toBeNull();
  expect(screen.getByText('Menunggu Purchasing')).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'Setuju' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Buat PO' })).toBeNull();
  expect(screen.getByLabelText('Kembali').getAttribute('href')).toBe('/dashboard/ppic/transaksi/permintaan-pembelian');
  expect(api.calls('POST /api/v1/approvals/7/approve')).toHaveLength(1);
});

it.each([
  ['Tolak', 'penolakan', 'reject', 'rejected'],
  ['Revisi', 'revisi', 'request-revision', 'revision_requested'],
])('PPIC %s requires and sends its note, then reloads the result', async (button, label, endpoint, status) => {
  let current = row();
  const api = installFakeApi({
    'GET /api/v1/approvals/7': () => ({ request: current, actions: [] }),
    [`POST /api/v1/approvals/7/${endpoint}`]: () => { current = row(1, status); return null; },
  });
  render(withUser(<Tinjau />, ['purchase-request.approve']));
  fireEvent.click(await screen.findByRole('button', { name: button }));
  fireEvent.click(screen.getByRole('button', { name: 'Kirim' }));
  expect(screen.getByRole('alert').textContent).toBe('Catatan wajib diisi.');
  expect(api.calls(`POST /api/v1/approvals/7/${endpoint}`)).toHaveLength(0);
  fireEvent.change(screen.getByLabelText(`Catatan ${label}`), { target: { value: ' Perbaiki jumlah barang ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kirim' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Kirim' })).toBeNull());
  expect(api.calls(`POST /api/v1/approvals/7/${endpoint}`)[0].body).toEqual({ note: 'Perbaiki jumlah barang' });
});

it('keeps the decision form open and preserves the note if the server rejects it', async () => {
  installFakeApi({ 'GET /api/v1/approvals/7': { request: row(), actions: [] }, 'POST /api/v1/approvals/7/reject': fail(403, 'Tidak berwenang') });
  render(withUser(<Tinjau />, ['purchase-request.approve']));
  fireEvent.click(await screen.findByRole('button', { name: 'Tolak' }));
  fireEvent.change(screen.getByLabelText('Catatan penolakan'), { target: { value: 'Tidak sesuai' } });
  fireEvent.click(screen.getByRole('button', { name: 'Kirim' }));
  expect((await screen.findByRole('alert')).textContent).toBe('Tidak berwenang');
  expect((screen.getByLabelText('Catatan penolakan') as HTMLTextAreaElement).value).toBe('Tidak sesuai');
});

it('users without approval permission cannot approve, reject or request a revision in PPIC', async () => {
  const api = installFakeApi({ 'GET /api/v1/approvals/7': { request: row(), actions: [] } });
  render(withUser(<Tinjau />, ['approval.view']));
  await screen.findByText('Anda tidak memiliki izin menyetujui permintaan pembelian.');
  for (const name of ['Setuju', 'Tolak', 'Revisi']) expect(screen.queryByRole('button', { name })).toBeNull();
  expect(api.calls('POST /api/v1/approvals/7/approve')).toHaveLength(0);
});

it('Purchasing waits for PPIC and does not expose its own decisions early', async () => {
  installFakeApi({ 'GET /api/v1/approvals/7': { request: row(), actions: [] }, 'GET /api/v1/purchase-orders': paged([]) });
  render(withUser(<Purchasing />, ['purchase-request.approve', 'purchase-order.create']));
  await screen.findByText('Menunggu persetujuan PPIC.');
  expect(screen.queryByRole('button', { name: 'Setuju' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Buat PO' })).toBeNull();
});

it('Purchasing langsung menyiapkan PO tanpa tombol persetujuan terpisah', async () => {
  const api = installFakeApi({
    'GET /api/v1/approvals/7': { request: row(3), actions: [] },
    'GET /api/v1/purchase-orders': paged([]),
    'GET /api/v1/suppliers': paged([]),
  });
  render(withUser(<Purchasing />, ['purchase-request.approve', 'purchase-order.create']));
  expect(await screen.findByRole('button', { name: 'Buat PO' })).not.toBeNull();
  expect(await screen.findByLabelText('Qty Beli baris 1')).toHaveProperty('value', '2');
  for (const name of ['Setuju', 'Tolak', 'Revisi']) expect(screen.queryByRole('button', { name })).toBeNull();
  expect(api.calls('POST /api/v1/approvals/7/approve')).toHaveLength(0);
});
