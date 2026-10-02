import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fail, installFakeApi, paged } from '@/test/fake-api';
import PenawaranHargaPPIC from './PenawaranHarga';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn(), replace: vi.fn() }) }));

const rows = [
  { id: 1, noOrder: 'SPH-001', namaClient: 'PT Maju', namaProyek: 'Kantor', status: 'DRAFT', tanggal: '2026-03-01', grandTotal: 0 },
  { id: 2, noOrder: 'SPH-002', namaClient: 'CV Jaya', namaProyek: 'Toko', status: 'PUBLISH', tanggal: '2026-03-02', grandTotal: 10 },
];

beforeEach(() => push.mockReset());

describe('PenawaranHarga list', () => {
  it('loads rows with Draft/Publish badges and edit links', async () => {
    const api = installFakeApi({ 'GET /api/v1/penawaran-harga': paged(rows) });
    render(<PenawaranHargaPPIC />);
    expect(await screen.findByText('SPH-001')).toBeTruthy();
    expect(screen.getByText('Draft').className).toContain('bg-gray-200');
    expect(screen.getByText('Publish').className).toContain('bg-[#FF8A00]');
    expect(screen.getByText('PT Maju')).toBeTruthy();
    expect(screen.getAllByText('Edit')[1].getAttribute('href')).toBe('/dashboard/ppic/master/penawaran-harga/estimasi-penawaran-biaya/2');
    const q = api.calls('GET /api/v1/penawaran-harga')[0].query;
    expect(q.get('page')).toBe('1');
    expect(q.get('search')).toBeNull();
  });

  it('shows empty and error states', async () => {
    installFakeApi({ 'GET /api/v1/penawaran-harga': paged([]) });
    const { unmount } = render(<PenawaranHargaPPIC />);
    expect(await screen.findByText('Data tidak ditemukan.')).toBeTruthy();
    unmount();
    installFakeApi({ 'GET /api/v1/penawaran-harga': fail(500, 'Gagal total') });
    render(<PenawaranHargaPPIC />);
    expect(await screen.findByText('Gagal total')).toBeTruthy();
  });

  it('sends the search param and page=2', async () => {
    const api = installFakeApi({ 'GET /api/v1/penawaran-harga': paged(rows, { total: 45 }) });
    render(<PenawaranHargaPPIC />);
    await screen.findByText('SPH-001');
    fireEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    await waitFor(() => expect(api.calls('GET /api/v1/penawaran-harga').some((c) => c.query.get('page') === '2')).toBe(true));
    fireEvent.change(screen.getByLabelText('Cari penawaran harga'), { target: { value: ' Maju ' } });
    await waitFor(() => {
      const last = api.calls('GET /api/v1/penawaran-harga').at(-1)!;
      expect(last.query.get('search')).toBe('Maju');
      expect(last.query.get('page')).toBe('1');
    });
  });

  describe('Tambah modal', () => {
    const open = async () => {
      render(<PenawaranHargaPPIC />);
      await screen.findByText('SPH-001');
      fireEvent.click(screen.getByText('Tambah Data'));
    };

    it('requires both client and project', async () => {
      const api = installFakeApi({ 'GET /api/v1/penawaran-harga': paged(rows) });
      await open();
      fireEvent.click(screen.getByText('Simpan'));
      expect(screen.getByText('Nama client dan nama projek wajib diisi.')).toBeTruthy();
      fireEvent.change(screen.getByLabelText('Nama Client'), { target: { value: 'PT X' } });
      expect(screen.queryByText('Nama client dan nama projek wajib diisi.')).toBeNull();
      fireEvent.click(screen.getByText('Simpan'));
      expect(screen.getByText('Nama client dan nama projek wajib diisi.')).toBeTruthy();
      fireEvent.change(screen.getByLabelText('Nama Client'), { target: { value: '   ' } });
      fireEvent.change(screen.getByLabelText('Nama Projek'), { target: { value: 'P' } });
      fireEvent.click(screen.getByText('Simpan'));
      expect(screen.getByText('Nama client dan nama projek wajib diisi.')).toBeTruthy();
      expect(api.calls('POST /api/v1/penawaran-harga')).toHaveLength(0);
      expect((screen.getByLabelText('Nama Client') as HTMLInputElement).maxLength).toBe(191);
      expect((screen.getByLabelText('Nama Projek') as HTMLInputElement).maxLength).toBe(191);
    });

    it('POSTs both names and navigates to the estimasi route', async () => {
      const api = installFakeApi({ 'GET /api/v1/penawaran-harga': paged(rows), 'POST /api/v1/penawaran-harga': { id: 9 } });
      await open();
      fireEvent.change(screen.getByLabelText('Nama Client'), { target: { value: ' PT Baru ' } });
      fireEvent.change(screen.getByLabelText('Nama Projek'), { target: { value: 'Rumah' } });
      fireEvent.click(screen.getByText('Simpan'));
      await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/ppic/master/penawaran-harga/estimasi-penawaran-biaya/9'));
      expect(api.calls('POST /api/v1/penawaran-harga')[0].body).toEqual({ namaClient: 'PT Baru', namaProyek: 'Rumah' });
    });

    it('shows backend errors, and closes with Batal and Escape', async () => {
      installFakeApi({ 'GET /api/v1/penawaran-harga': paged(rows), 'POST /api/v1/penawaran-harga': fail(400, 'Client tidak valid') });
      await open();
      fireEvent.change(screen.getByLabelText('Nama Client'), { target: { value: 'A' } });
      fireEvent.change(screen.getByLabelText('Nama Projek'), { target: { value: 'B' } });
      fireEvent.click(screen.getByText('Simpan'));
      expect(await screen.findByText('Client tidak valid')).toBeTruthy();
      expect(push).not.toHaveBeenCalled();
      fireEvent.click(screen.getByText('Batal'));
      expect(screen.queryByRole('dialog')).toBeNull();
      fireEvent.click(screen.getByText('Tambah Data'));
      expect((screen.getByLabelText('Nama Client') as HTMLInputElement).value).toBe('');
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
