import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { fail, installFakeApi, paged } from '@/test/fake-api';
import Form from './PermintaanPembelianTambah';
import type { PermintaanPembelian } from '../data/pembelian';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }));
const basePath = '/dashboard/gudang/transaksi/permintaan-pembelian';
const existing: PermintaanPembelian = {
  id: 7, tanggal: '2026-11-09', permintaan: 'Bahan', status: 'Belum Disetujui', statusApi: 'pending', bagian: 'Gudang', nama: 'Fauzi', jabatan: 'Staff', periode: 'November 2026', catatan: 'Penting',
  barang: [{ namaBarang: 'Paku', qty: 5, satuan: 'Kg', proyek: 'Hotel', noSpk: 'SPK-1', supplier: 'PT Bahan', tanggal: '2026-11-09', keterangan: 'Segera', deadlineTanggal: '2026-11-20' }],
};
const routes = {
  'GET /api/v1/items': paged([]),
  'GET /api/v1/tracking/clients': [{ client: 'Client' }],
  'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: 'Client', projectName: 'Hotel' }],
  'GET /api/v1/tracking/spk/SPK-1': { noSpk: 'SPK-1', client: 'Client', products: [{ name: 'Hotel' }] },
};
const change = (name: string, value: string) => fireEvent.change(screen.getByLabelText(name), { target: { value } });
const chooseProject = async (row: number, name: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Proyek baris ${row}` }));
  fireEvent.click(await screen.findByRole('option', { name }));
};
beforeEach(() => push.mockReset());

describe('purchase request form', () => {
  it('loads unique project names from Daftar Proyek and supports searching', async () => {
    const api = installFakeApi({ ...routes, 'GET /api/v1/tracking/spk': [
      { noSpk: 'SPK-1', client: 'Client', projectName: 'Hotel' },
      { noSpk: 'SPK-2', client: 'Client', projectName: 'Hotel' },
      { noSpk: 'SPK-3', client: 'Client', projectName: 'Kantor' },
      { noSpk: 'SPK-4', client: 'Client', projectName: null },
    ] });
    render(<Form basePath={basePath} />);
    fireEvent.click(screen.getByRole('button', { name: 'Proyek baris 1' }));
    await screen.findByRole('option', { name: 'Hotel' });
    expect(screen.getAllByRole('option', { name: 'Hotel' })).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Kantor' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari Proyek baris 1' }), { target: { value: 'Kantor' } });
    expect(screen.queryByRole('option', { name: 'Hotel' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'Kantor' }));
    expect(screen.getByRole('button', { name: 'Proyek baris 1' }).textContent).toBe('Kantor');
    expect(api.calls('GET /api/v1/tracking/spk')).toHaveLength(1);
    expect(api.calls('GET /api/v1/tracking/spk')[0].query.has('limit')).toBe(false);
  });

  it('preserves a saved project no longer present in Daftar Proyek', async () => {
    const api = installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': null });
    render(<Form permintaan={{ ...existing, barang: [{ ...existing.barang[0], proyek: 'Proyek lama' }] }} basePath={basePath} editing />);
    expect(screen.getByRole('button', { name: 'Proyek baris 1' }).textContent).toBe('Proyek lama');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/approvals/7')[0].body).toMatchObject({ payload: { items: [{ proyek: 'Proyek lama', noSpk: 'SPK-1' }] } });
  });

  it('changes only the selected row project and clears its previous SPK', async () => {
    const api = installFakeApi({ ...routes,
      'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-2', client: 'Client', projectName: 'Kantor' }],
      'PUT /api/v1/approvals/7': null,
    });
    render(<Form permintaan={{ ...existing, barang: [existing.barang[0], { ...existing.barang[0], namaBarang: 'Lem' }] }} basePath={basePath} editing />);
    await chooseProject(1, 'Kantor');
    expect(screen.getByRole('button', { name: 'Proyek baris 2' }).textContent).toBe('Hotel');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1));
    const body = api.calls('PUT /api/v1/approvals/7')[0].body as { payload: { items: Record<string, unknown>[] } };
    expect(body.payload.items[0].proyek).toBe('Kantor');
    expect(body.payload.items[0]).not.toHaveProperty('noSpk');
    expect(body.payload.items[1]).toMatchObject({ proyek: 'Hotel', noSpk: 'SPK-1' });
  });

  it('shows an empty state when Daftar Proyek has no usable names', async () => {
    installFakeApi({ ...routes, 'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: 'Client', projectName: '' }] });
    render(<Form basePath={basePath} />);
    fireEvent.click(screen.getByRole('button', { name: 'Proyek baris 1' }));
    await screen.findByText('Belum ada proyek tersedia.');
    expect(screen.queryByRole('option', { name: 'SPK-1' })).toBeNull();
  });

  it('shows project loading errors', async () => {
    installFakeApi({ ...routes, 'GET /api/v1/tracking/spk': fail(500, 'Tracking tidak tersedia') });
    render(<Form basePath={basePath} />);
    expect((await screen.findByRole('alert')).textContent).toBe('Tracking tidak tersedia');
  });

  it('provides dummy dropdown choices for the three required requester fields', () => {
    installFakeApi(routes);
    render(<Form basePath={basePath} />);
    for (const [name, choice] of [['Bagian / Sub Bagian', 'Gudang'], ['Nama pemohon', 'Fauzi'], ['Jabatan', 'Staff']]) {
      const select = screen.getByRole('combobox', { name }) as HTMLSelectElement;
      expect(select.value).toBe('');
      expect(within(select).getByRole('option', { name: choice })).toBeTruthy();
      change(name, choice);
      expect(select.value).toBe(choice);
    }
  });

  it('preserves existing requester values outside the dummy choices during editing', async () => {
    const api = installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': null });
    render(<Form permintaan={{ ...existing, bagian: 'Maintenance', nama: 'Rina', jabatan: 'Teknisi' }} basePath={basePath} editing />);
    for (const [name, value] of [['Bagian / Sub Bagian', 'Maintenance'], ['Nama pemohon', 'Rina'], ['Jabatan', 'Teknisi']]) {
      expect((screen.getByRole('combobox', { name }) as HTMLSelectElement).value).toBe(value);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/approvals/7')[0].body).toMatchObject({
      payload: { bagian: 'Maintenance', namaPemohon: 'Rina', jabatan: 'Teknisi' },
    });
  });

  it('submits the photo fields in a new request, omitting blank rows', async () => {
    const api = installFakeApi({ ...routes, 'POST /api/v1/approvals': { id: 8 } });
    render(<Form basePath={basePath} />);
    change('Bagian / Sub Bagian', 'Gudang');
    change('Nama pemohon', 'Fauzi');
    change('Jabatan', 'Staff');
    change('Tanggal Pengajuan', '2026-11-09');
    expect(screen.queryByLabelText('Periode')).toBeNull();
    change('Nama Barang baris 1', 'Paku');
    change('QTY baris 1', '5');
    change('Satuan baris 1', 'Kg');
    await chooseProject(1, 'Hotel');
    change('Keterangan baris 1', 'Segera');
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['No', 'Nama Barang', 'QTY', 'SAT', 'Proyek', 'Keterangan']);
    expect(screen.queryByRole('button', { name: 'Client' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'No SPK' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Permintaan Pembelian' }));
    await waitFor(() => expect(api.calls('POST /api/v1/approvals')).toHaveLength(1));
    expect(api.calls('POST /api/v1/approvals')[0].body).toEqual({ type: 'purchase-request', payload: {
      bagian: 'Gudang', namaPemohon: 'Fauzi', jabatan: 'Staff', tanggalPengajuan: '2026-11-09', items: [{ namaBarang: 'Paku', qty: 5, satuan: 'Kg', proyek: 'Hotel', keterangan: 'Segera' }],
    } });
    await waitFor(() => expect(push).toHaveBeenCalledWith(basePath));
  });

  it('edits the same request, preserves fields, and returns to the Gudang list', async () => {
    const api = installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': null });
    render(<Form permintaan={existing} basePath={basePath} editing />);
    for (const label of ['Tanggal baris 1', 'Supplier baris 1', 'Dikirim Tanggal baris 1']) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
    change('Keterangan baris 1', 'Tambahan');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/approvals/7')[0].body).toMatchObject({ payload: { periode: 'November 2026', notes: 'Penting', items: [{ ...existing.barang[0], keterangan: 'Tambahan' }] } });
    expect(api.calls('POST /api/v1/approvals')).toHaveLength(0);
    await waitFor(() => expect(push).toHaveBeenCalledWith(basePath));
  });

  it('removes an item from the edited request without submitting its cleared fields', async () => {
    const api = installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': null });
    render(<Form permintaan={{ ...existing, barang: [...existing.barang, { ...existing.barang[0], namaBarang: 'Lem' }] }} basePath={basePath} editing />);
    fireEvent.click(screen.getByRole('button', { name: 'Hapus baris 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/approvals/7')[0].body).toMatchObject({ payload: { items: [{ namaBarang: 'Lem' }] } });
  });

  it('retains changes and displays the server error when saving fails', async () => {
    installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': fail(400, 'Permintaan sudah disetujui') });
    render(<Form permintaan={existing} basePath={basePath} editing />);
    change('Keterangan baris 1', 'Catatan baru');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    expect(await screen.findByText('Permintaan sudah disetujui')).toBeTruthy();
    expect((screen.getByLabelText('Keterangan baris 1') as HTMLInputElement).value).toBe('Catatan baru');
    expect(push).not.toHaveBeenCalled();
  });

  const fillHeader = () => {
    change('Bagian / Sub Bagian', 'Gudang');
    change('Nama pemohon', 'Fauzi');
    change('Jabatan', 'Staff');
    change('Tanggal Pengajuan', '2026-11-09');
  };
  const fillRow = async () => {
    change('Nama Barang baris 1', 'Paku');
    change('QTY baris 1', '5');
    change('Satuan baris 1', 'Kg');
    await chooseProject(1, 'Hotel');
  };

  it('sends only the filled row, without noSpk or empty optional fields', async () => {
    const api = installFakeApi({ ...routes, 'POST /api/v1/approvals': { id: 8 } });
    render(<Form basePath={basePath} />);
    fillHeader();
    await fillRow();
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Permintaan Pembelian' }));
    await waitFor(() => expect(api.calls('POST /api/v1/approvals')).toHaveLength(1));
    const payload = (api.calls('POST /api/v1/approvals')[0].body as { payload: Record<string, unknown> }).payload;
    expect(payload).not.toHaveProperty('periode');
    expect(payload.items).toEqual([{ namaBarang: 'Paku', qty: 5, satuan: 'Kg', proyek: 'Hotel' }]);
    expect(Object.keys((payload.items as object[])[0])).toEqual(['namaBarang', 'satuan', 'proyek', 'qty']);
  });

  it('validates rows containing only notes instead of silently discarding them', async () => {
    const api = installFakeApi(routes);
    render(<Form basePath={basePath} />);
    fillHeader();
    await fillRow();
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah Baris' }));
    change('Keterangan baris 2', 'Segera');
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Permintaan Pembelian' }));
    expect(screen.getByText('Lengkapi semua kolom di setiap baris barang yang dipakai (QTY minimal 1).')).not.toBeNull();
    expect(api.calls('POST /api/v1/approvals')).toHaveLength(0);
  });

  it('preserves hidden legacy dates and supplier when saving an edited request', async () => {
    const api = installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': null });
    render(<Form permintaan={existing} basePath={basePath} editing />);
    change('QTY baris 1', '8');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1));
    const body = api.calls('PUT /api/v1/approvals/7')[0].body as { payload: { items: Record<string, unknown>[] } };
    expect(body.payload.items[0]).toMatchObject({ qty: 8, tanggal: '2026-11-09', supplier: 'PT Bahan', deadlineTanggal: '2026-11-20' });
    expect(body.payload.items[0]).not.toHaveProperty('dikirimTanggal');
  });

  it('starts with one row and adds more with Tambah Baris', () => {
    installFakeApi(routes);
    render(<Form basePath={basePath} />);
    expect(screen.getByLabelText('Nama Barang baris 1')).toBeTruthy();
    expect(screen.queryByLabelText('Nama Barang baris 2')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah Baris' }));
    expect(screen.getByLabelText('Nama Barang baris 2')).toBeTruthy();
  });

  it('keeps noSpk when the edited row has one', async () => {
    const api = installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': null });
    render(<Form permintaan={existing} basePath={basePath} editing />);
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/approvals/7')[0].body).toMatchObject({ payload: { items: [{ noSpk: 'SPK-1' }] } });
  });

  it('shows a server error on items.0.namaBarang next to the right row', async () => {
    installFakeApi({ ...routes, 'POST /api/v1/approvals': fail(400, 'Input Validation Error!', { 'items.0.namaBarang': ['Nama barang tidak valid'] }) });
    render(<Form basePath={basePath} />);
    fillHeader();
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah Baris' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah Baris' }));
    change('Nama Barang baris 3', 'Paku');
    change('QTY baris 3', '5');
    change('Satuan baris 3', 'Kg');
    await chooseProject(3, 'Hotel');
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Permintaan Pembelian' }));
    expect(await screen.findByText('Baris 3: Nama barang tidak valid')).toBeTruthy();
  });
});
