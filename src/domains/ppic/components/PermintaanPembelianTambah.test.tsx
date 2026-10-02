import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { fail, installFakeApi } from '@/test/fake-api';
import Tambah from './PermintaanPembelianTambah';
import { withUser } from './as-user';

const push = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back, replace: vi.fn() }) }));

const text = (ph: string) => screen.getAllByPlaceholderText(ph) as HTMLInputElement[];
const fill = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

function fillHeader() {
  fill(screen.getByPlaceholderText(/Contoh: Divisi/), 'Produksi');
  fill(screen.getByPlaceholderText('Masukkan nama pemohon'), 'Budi');
  fill(screen.getByPlaceholderText('Masukkan jabatan pemohon'), 'Staff');
}
function fillRow(i: number, v: { nama: string; qty: string; satuan: string; proyek: string; spk: string }) {
  fill(text('Masukkan nama barang')[i], v.nama);
  fill(text('0')[i], v.qty);
  fill(text('Pcs/Unit/Koli')[i], v.satuan);
  fill(text('Isi nama proyek')[i], v.proyek);
  fill(text('000/SPK/...')[i], v.spk);
}

beforeEach(() => { push.mockReset(); back.mockReset(); });

describe('PermintaanPembelianTambah', () => {
  it('renders 8 empty rows and goes back', () => {
    installFakeApi();
    render(<Tambah />);
    expect(text('Masukkan nama barang')).toHaveLength(8);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(back).toHaveBeenCalled();
  });

  it('submits purchase-request with integer qty, drops empty rows, then navigates', async () => {
    const api = installFakeApi({ 'POST /api/v1/approvals': { id: 1 } });
    render(<Tambah />);
    fillHeader();
    fill(document.querySelector('input[type=date]')!, '2026-04-01');
    fillRow(0, { nama: 'Triplex', qty: '12', satuan: 'Lbr', proyek: 'Kantor', spk: 'SPK-1' });
    fillRow(3, { nama: 'Paku', qty: '007', satuan: 'Kg', proyek: 'Kantor', spk: 'SPK-2' });
    fireEvent.click(screen.getByText('Submit'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/ppic/transaksi/permintaan-pembelian'));
    const body = api.calls('POST /api/v1/approvals')[0].body;
    expect(body).toEqual({
      type: 'purchase-request',
      payload: {
        bagian: 'Produksi', namaPemohon: 'Budi', jabatan: 'Staff', tanggalPengajuan: '2026-04-01',
        items: [
          { namaBarang: 'Triplex', qty: 12, satuan: 'Lbr', proyek: 'Kantor', noSpk: 'SPK-1' },
          { namaBarang: 'Paku', qty: 7, satuan: 'Kg', proyek: 'Kantor', noSpk: 'SPK-2' },
        ],
      },
    });
  });

  it('validates the header', async () => {
    const api = installFakeApi();
    render(<Tambah />);
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText('Lengkapi bagian, nama, jabatan, dan tanggal pengajuan.')).toBeTruthy();
    expect(api.all()).toHaveLength(0);
  });

  it('requires at least one row', () => {
    const api = installFakeApi();
    render(<Tambah />);
    fillHeader();
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText(/Lengkapi semua kolom di setiap baris barang/)).toBeTruthy();
    expect(api.all()).toHaveLength(0);
  });

  it('rejects a partially filled row and qty 0', () => {
    const api = installFakeApi();
    render(<Tambah />);
    fillHeader();
    fill(text('Masukkan nama barang')[0], 'Triplex');
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText(/Lengkapi semua kolom/)).toBeTruthy();
    fillRow(0, { nama: 'Triplex', qty: '0', satuan: 'Lbr', proyek: 'K', spk: 'S' });
    fireEvent.click(screen.getByText('Submit'));
    expect(screen.getByText(/QTY minimal 1/)).toBeTruthy();
    expect(api.all()).toHaveLength(0);
  });

  it('keeps only digits in qty and applies maxLength limits', () => {
    installFakeApi();
    render(<Tambah />);
    const qty = text('0')[0];
    fill(qty, '1a2.5-e');
    expect(qty.value).toBe('125');
    expect(qty.maxLength).toBe(9);
    expect((screen.getByPlaceholderText(/Contoh: Divisi/) as HTMLInputElement).maxLength).toBe(100);
    expect((screen.getByPlaceholderText('Masukkan nama pemohon') as HTMLInputElement).maxLength).toBe(191);
    expect((screen.getByPlaceholderText('Masukkan jabatan pemohon') as HTMLInputElement).maxLength).toBe(100);
    expect(text('Masukkan nama barang')[0].maxLength).toBe(191);
    expect(text('Pcs/Unit/Koli')[0].maxLength).toBe(50);
    expect(text('Isi nama proyek')[0].maxLength).toBe(191);
    expect(text('000/SPK/...')[0].maxLength).toBe(100);
  });

  it('shows backend errors and does not navigate', async () => {
    installFakeApi({ 'POST /api/v1/approvals': fail(400, 'Payload tidak valid') });
    render(<Tambah />);
    fillHeader();
    fillRow(0, { nama: 'Triplex', qty: '1', satuan: 'Lbr', proyek: 'K', spk: 'S' });
    fireEvent.click(screen.getByText('Submit'));
    expect(await screen.findByText('Payload tidak valid')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText('Submit')).toBeTruthy();
  });
});


describe('permissions', () => {
  it('a view-only user keeps the screen but not the actions', async () => {
    installFakeApi();
    render(withUser(<Tambah />, ['approval.view']));
    expect(screen.getByText(/Anda tidak punya izin/)).toBeTruthy();
    expect(screen.queryAllByPlaceholderText('Masukkan nama barang')).toHaveLength(0);
  });

  it.each([
    ['holds the permission', ['purchase-request.create'], false],
    ['is a superadmin', [], true],
  ])('a user who %s sees the actions', async (_label, perms, isSuperadmin) => {
    installFakeApi();
    render(withUser(<Tambah />, perms, isSuperadmin));
    expect(text('Masukkan nama barang')).toHaveLength(8);
  });
});
