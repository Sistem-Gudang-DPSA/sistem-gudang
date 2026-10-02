import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import AlokasiBarang from './AlokasiBarang';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: '3' }),
}));

const line = (id: number, bisa: number) => ({
  id, spkInternalId: id, noSpk: `SPKI-${id}`, tanggalTerbit: '2026-05-01', tujuanProduksi: 'STOCK', spkKlienInduk: 'SPK-1',
  penanggungJawab: 'Budi', targetSelesai: '2026-06-01', catatan: null, sku: `SKU-${id}`, namaBarang: `Barang ${id}`,
  periode: '2026-05', totalQty: 10, alokasiSpkKlien: 0, alokasiStokBebas: bisa, totalStock: 10, totalBisaPakai: bisa, status: bisa ? 'BUFFER' : 'LOCKED',
});
const dokubah = paged([{ id: 1, noSpk: 'SPK-1', client: 'PT Maju', status: 'APPROVED' }]);
const jumlah = () => screen.getByLabelText('Jumlah Mutasi') as HTMLInputElement;

async function load(bisa = 6, extra: Record<string, unknown> = {}) {
  const api = installFakeApi({
    'GET /api/v1/spk-internal': paged([line(2, 1), line(3, bisa)]),
    'GET /api/v1/dokubah': dokubah,
    'POST /api/v1/spk-internal/3/allocate': line(3, 0),
    ...extra,
  });
  render(<AlokasiBarang />);
  await screen.findByDisplayValue('SPKI-3');
  await screen.findByText('SPK-1 - PT Maju');
  return api;
}
const choose = () => fireEvent.change(screen.getByLabelText('Pilih SPK Klien'), { target: { value: 'SPK-1' } });
const submit = () => fireEvent.click(screen.getByText('Kaitkan'));

beforeEach(() => replace.mockClear());

describe('AlokasiBarang', () => {
  it('shows the SPK Internal row matching the route id and its stock bebas', async () => {
    await load();
    expect((screen.getByLabelText('SKU & Nama Barang') as HTMLInputElement).value).toBe('SKU-3 - Barang 3');
    expect(screen.getByText('Stock bebas : 6 pcs')).toBeTruthy();
  });

  it('not found when the id is not in the list', async () => {
    installFakeApi({ 'GET /api/v1/spk-internal': paged([line(2, 1)]), 'GET /api/v1/dokubah': dokubah });
    render(<AlokasiBarang />);
    expect(await screen.findByText('SPK Internal tidak ditemukan.')).toBeTruthy();
  });

  it('backend error on load', async () => {
    installFakeApi({ 'GET /api/v1/spk-internal': fail(500, 'Server error'), 'GET /api/v1/dokubah': dokubah });
    render(<AlokasiBarang />);
    expect(await screen.findByText('Server error')).toBeTruthy();
  });

  it('POSTs the integer jumlah to allocate and redirects', async () => {
    const api = await load();
    choose();
    fireEvent.change(jumlah(), { target: { value: '6' } });
    submit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard/ppic/transaksi/spk-mutasi-internal'));
    expect(api.calls('POST /api/v1/spk-internal/3/allocate')[0].body).toEqual({ jumlah: 6 });
  });

  it('cannot exceed stock bebas', async () => {
    const api = await load();
    choose();
    fireEvent.change(jumlah(), { target: { value: '7' } });
    submit();
    expect(await screen.findByText('Jumlah Mutasi tidak boleh melebihi stock bebas (6 pcs).')).toBeTruthy();
    expect(api.calls('POST /api/v1/spk-internal/3/allocate')).toHaveLength(0);
  });

  it('requires an SPK Klien', async () => {
    const api = await load();
    fireEvent.change(jumlah(), { target: { value: '2' } });
    submit();
    expect(await screen.findByText('Pilih SPK Klien terlebih dahulu.')).toBeTruthy();
    expect(api.calls('POST /api/v1/spk-internal/3/allocate')).toHaveLength(0);
  });

  it('requires jumlah > 0', async () => {
    const api = await load();
    choose();
    submit();
    expect(await screen.findByText(/wajib diisi dengan angka bulat lebih dari 0/)).toBeTruthy();
    fireEvent.change(jumlah(), { target: { value: '0' } });
    submit();
    expect(await screen.findByText(/lebih dari 0/)).toBeTruthy();
    expect(api.calls('POST /api/v1/spk-internal/3/allocate')).toHaveLength(0);
  });

  it('shows backend error and stays', async () => {
    await load(6, { 'POST /api/v1/spk-internal/3/allocate': fail(400, 'Jumlah melebihi total bisa pakai') });
    choose();
    fireEvent.change(jumlah(), { target: { value: '2' } });
    submit();
    expect(await screen.findByText('Jumlah melebihi total bisa pakai')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('jumlah keeps digits only (maxLength 9)', async () => {
    await load();
    for (const bad of ['1e5', '-3', '2.5']) {
      fireEvent.change(jumlah(), { target: { value: bad } });
      expect(jumlah().value).toBe(bad.replace(/\D/g, ''));
    }
    expect(jumlah().maxLength).toBe(9);
  });

  it('zero stock bebas disables Kaitkan and shows a warning', async () => {
    await load(0);
    expect((screen.getByText('Kaitkan') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Stock bebas barang ini sudah habis/)).toBeTruthy();
  });

  it.fails('BUG: catatan textarea has no maxLength 500 like the other catatan fields', async () => {
    await load();
    expect((screen.getByLabelText('Catatan :') as HTMLTextAreaElement).maxLength).toBe(500);
  });
});
