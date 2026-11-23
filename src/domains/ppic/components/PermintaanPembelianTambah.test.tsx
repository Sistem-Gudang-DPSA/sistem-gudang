import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { fail, installFakeApi, paged } from '@/test/fake-api';
import Form from './PermintaanPembelianTambah';
import type { PermintaanPembelian } from '../data/pembelian';
import GudangForm from '@/domains/inventory/components/PermintaanPembelianTambah';
import { AuthUserProvider } from '@/domains/auth/user-context';
import type { AuthUser } from '@/domains/auth/types';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
const cetak = vi.hoisted(() => ({ cetakLaporan: vi.fn(async () => {}) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }));
vi.mock('@/shared/lib/print-laporan', () => ({ cetakLaporan: cetak.cetakLaporan, tungguGambarCetak: vi.fn() }));
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
beforeEach(() => { push.mockReset(); cetak.cetakLaporan.mockClear(); });

describe('default pemohon Gudang dari akun login', () => {
  const user: AuthUser = { id: 9, username: 'imel', email: 'imel@x.id', roleId: 2, roleName: 'Koordinator Inventory', isSuperadmin: false, domainCode: 'inventory', permissions: ['purchase-request.create'] };

  it('langsung mengisi bagian, username, dan role, lalu mengirimkannya tanpa memilih ulang', async () => {
    const api = installFakeApi({ ...routes, 'POST /api/v1/approvals': { id: 8 } });
    render(<AuthUserProvider user={user}><GudangForm /></AuthUserProvider>);
    expect((screen.getByLabelText('Bagian / Sub Bagian') as HTMLSelectElement).value).toBe('Gudang');
    expect((screen.getByLabelText('Nama pemohon') as HTMLSelectElement).value).toBe('imel');
    expect((screen.getByLabelText('Jabatan') as HTMLSelectElement).value).toBe('Koordinator Inventory');
    change('Nama Barang baris 1', 'Paku');
    change('QTY baris 1', '5');
    change('Satuan baris 1', 'Kg');
    await chooseProject(1, 'Client');
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Permintaan Pembelian' }));
    await waitFor(() => expect(api.calls('POST /api/v1/approvals')).toHaveLength(1));
    expect(api.calls('POST /api/v1/approvals')[0].body).toMatchObject({ payload: { bagian: 'Gudang', namaPemohon: 'imel', jabatan: 'Koordinator Inventory' } });
    await waitFor(() => expect(push).toHaveBeenCalledWith(basePath));
  });

  it('mengambil bagian dari divisi akun, dengan Gudang sebagai default jika divisi kosong', () => {
    installFakeApi(routes);
    const view = render(<AuthUserProvider user={{ ...user, domainCode: 'gudang-barang-jadi' }}><GudangForm /></AuthUserProvider>);
    expect((screen.getByLabelText('Bagian / Sub Bagian') as HTMLSelectElement).value).toBe('Gudang Barang Jadi');
    view.unmount();
    render(<AuthUserProvider user={{ ...user, domainCode: null }}><GudangForm /></AuthUserProvider>);
    expect((screen.getByLabelText('Bagian / Sub Bagian') as HTMLSelectElement).value).toBe('Gudang');
  });

  it('identitas akun tampil tetap tanpa dropdown dan tidak dapat diubah', () => {
    installFakeApi(routes);
    render(<AuthUserProvider user={user}><GudangForm /></AuthUserProvider>);
    for (const [label, value] of [['Bagian / Sub Bagian', 'Gudang'], ['Nama pemohon', 'imel'], ['Jabatan', 'Koordinator Inventory']]) {
      const input = screen.getByRole('textbox', { name: label }) as HTMLInputElement;
      expect(input.readOnly).toBe(true);
      expect(input.value).toBe(value);
      expect(screen.queryByRole('combobox', { name: label })).toBeNull();
    }
  });

  it('mempertahankan identitas permintaan lama ketika diedit meskipun ada default akun', () => {
    installFakeApi(routes);
    render(<AuthUserProvider user={user}><Form permintaan={existing} basePath={basePath} editing readOnlyPemohon initialPemohon={{ bagian: 'Produksi', namaPemohon: user.username, jabatan: user.roleName }} /></AuthUserProvider>);
    expect((screen.getByLabelText('Bagian / Sub Bagian') as HTMLSelectElement).value).toBe('Gudang');
    expect((screen.getByRole('textbox', { name: 'Nama pemohon' }) as HTMLInputElement).readOnly).toBe(true);
    expect((screen.getByLabelText('Nama pemohon') as HTMLInputElement).value).toBe('Fauzi');
    expect((screen.getByLabelText('Jabatan') as HTMLSelectElement).value).toBe('Staff');
  });

  it('form PPIC tetap memakai pilihan awal tanpa default Gudang', () => {
    installFakeApi(routes);
    render(<AuthUserProvider user={user}><Form /></AuthUserProvider>);
    for (const field of ['Bagian / Sub Bagian', 'Nama pemohon', 'Jabatan']) {
      expect((screen.getByLabelText(field) as HTMLSelectElement).value).toBe('');
    }
  });
});

describe('purchase request form', () => {
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
    change('Tanggal baris 1', '2026-11-09');
    await chooseProject(1, 'Client');
    change('Keterangan baris 1', 'Segera');
    change('Dikirim Tanggal baris 1', '2026-11-20');
    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['No', 'Tanggal', 'Supplier', 'Nama Barang', 'QTY', 'SAT', 'Proyek', 'Keterangan', 'Dikirim Tanggal']);
    expect(screen.queryByRole('button', { name: 'Client' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'No SPK' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Permintaan Pembelian' }));
    await waitFor(() => expect(api.calls('POST /api/v1/approvals')).toHaveLength(1));
    expect(api.calls('POST /api/v1/approvals')[0].body).toEqual({ type: 'purchase-request', payload: {
      bagian: 'Gudang', namaPemohon: 'Fauzi', jabatan: 'Staff', tanggalPengajuan: '2026-11-09',
      items: [{ namaBarang: 'Paku', qty: 5, satuan: 'Kg', proyek: 'Client', noSpk: undefined, supplier: undefined, tanggal: '2026-11-09', keterangan: 'Segera', deadlineTanggal: '2026-11-20' }],
    } });
    await waitFor(() => expect(push).toHaveBeenCalledWith(basePath));
  });

  it.each([['PPIC', Form], ['Gudang', GudangForm]] as const)('loads unique client names from Daftar Proyek and supports searching in %s', async (_division, Component) => {
    const api = installFakeApi({ ...routes, 'GET /api/v1/tracking/spk': [
      { noSpk: 'SPK-1', client: 'PT MAJU JAYA', projectName: 'Hotel' },
      { noSpk: 'SPK-2', client: ' PT MAJU JAYA ', projectName: 'Hotel Lain' },
      { noSpk: 'SPK-3', client: 'CV SINAR ABADI', projectName: 'Kantor' },
      { noSpk: 'SPK-4', client: '', projectName: 'Proyek Tanpa Client' },
      { noSpk: 'SPK-5', client: ' - ', projectName: 'Proyek Lain' },
    ] });
    render(<Component />);
    fireEvent.click(screen.getByRole('button', { name: 'Proyek baris 1' }));
    await screen.findByRole('option', { name: 'PT MAJU JAYA' });
    expect(screen.getAllByRole('option', { name: 'PT MAJU JAYA' })).toHaveLength(1);
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((option) => option.textContent)).toEqual(['CV SINAR ABADI', 'PT MAJU JAYA']);
    expect(screen.queryByRole('option', { name: 'Hotel' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari Proyek baris 1' }), { target: { value: 'SINAR' } });
    expect(screen.queryByRole('option', { name: 'PT MAJU JAYA' })).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'CV SINAR ABADI' }));
    expect(screen.getByRole('button', { name: 'Proyek baris 1' }).textContent).toBe('CV SINAR ABADI');
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
      'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-2', client: 'CV SINAR ABADI', projectName: 'Kantor' }],
      'PUT /api/v1/approvals/7': null,
    });
    render(<Form permintaan={{ ...existing, barang: [existing.barang[0], { ...existing.barang[0], namaBarang: 'Lem' }] }} basePath={basePath} editing />);
    await chooseProject(1, 'CV SINAR ABADI');
    expect(screen.getByRole('button', { name: 'Proyek baris 2' }).textContent).toBe('Hotel');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1));
    const body = api.calls('PUT /api/v1/approvals/7')[0].body as { payload: { items: Record<string, unknown>[] } };
    expect(body.payload.items[0].proyek).toBe('CV SINAR ABADI');
    expect(body.payload.items[0]).not.toHaveProperty('noSpk');
    expect(body.payload.items[1]).toMatchObject({ proyek: 'Hotel', noSpk: 'SPK-1' });
  });

  it('shows an empty state when Daftar Proyek has no usable names', async () => {
    installFakeApi({ ...routes, 'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: '', projectName: 'Hotel' }] });
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

  it('edits the same request, preserves fields, and returns to the Gudang list', async () => {
    const api = installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': null });
    render(<Form permintaan={existing} basePath={basePath} editing />);
    expect((screen.getByLabelText('Dikirim Tanggal baris 1') as HTMLInputElement).value).toBe('2026-11-20');
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
    await chooseProject(1, 'Client');
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
    expect(payload.items).toEqual([{ namaBarang: 'Paku', qty: 5, satuan: 'Kg', proyek: 'Client' }]);
    expect(Object.keys((payload.items as object[])[0])).toEqual(['namaBarang', 'satuan', 'proyek', 'qty']);
  });

  it.each([false, true])('form Gudang tidak menampilkan tombol Cetak (editing: %s)', async (editing) => {
    installFakeApi(routes);
    render(<Form basePath={basePath} editing={editing} permintaan={editing ? existing : undefined} />);
    expect(screen.queryByRole('button', { name: 'Cetak' })).toBeNull();
    expect(screen.getByRole('button', { name: editing ? 'Simpan Perubahan' : 'Ajukan Permintaan Pembelian' })).not.toBeNull();
    await screen.findByRole('button', { name: 'Proyek baris 1' });
  });

  it('mencetak form PPIC yang sedang diisi tanpa menyimpan permintaan', async () => {
    const api = installFakeApi(routes);
    render(<Form />);
    fillHeader();
    await fillRow();
    change('Keterangan baris 1', '<b>Segera</b>');
    fireEvent.click(screen.getByRole('button', { name: 'Cetak' }));
    await waitFor(() => expect(cetak.cetakLaporan).toHaveBeenCalledTimes(1));
    const [judul, html, opsi] = cetak.cetakLaporan.mock.calls[0] as unknown as [string, string, { label: string; identitas: unknown }];
    expect(judul).toBe('Form Permintaan Pembelian Bahan Baku');
    expect(html).toContain('Paku');
    expect(html).toContain('Client');
    expect(html).toContain('&lt;b&gt;Segera&lt;/b&gt;');
    expect(html).not.toContain('<b>Segera</b>');
    expect(opsi.label).toBe('permintaan pembelian');
    // Terbit mengikuti tanggal pengajuan (surat), bukan tanggal tetap.
    expect(opsi.identitas).toEqual({ kode: 'PPIC', nomor: '002', revisi: '00', terbit: '11/26' });
    expect(api.calls('POST /api/v1/approvals')).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
  });

  it('validates rows containing only a delivery date instead of silently discarding them', async () => {
    const api = installFakeApi(routes);
    render(<Form basePath={basePath} />);
    fillHeader();
    await fillRow();
    fireEvent.click(screen.getByRole('button', { name: '+ Tambah Baris' }));
    change('Dikirim Tanggal baris 2', '2026-11-20');
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Permintaan Pembelian' }));
    expect(screen.getByText('Lengkapi semua kolom di setiap baris barang yang dipakai (QTY minimal 1).')).not.toBeNull();
    expect(api.calls('POST /api/v1/approvals')).toHaveLength(0);
  });

  it('sends an edited delivery date using the API deadlineTanggal field', async () => {
    const api = installFakeApi({ ...routes, 'PUT /api/v1/approvals/7': null });
    render(<Form permintaan={existing} basePath={basePath} editing />);
    change('Dikirim Tanggal baris 1', '2026-11-25');
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(api.calls('PUT /api/v1/approvals/7')).toHaveLength(1));
    const body = api.calls('PUT /api/v1/approvals/7')[0].body as { payload: { items: Record<string, unknown>[] } };
    expect(body.payload.items[0].deadlineTanggal).toBe('2026-11-25');
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

  it('menambahkan barang menipis dari rekomendasi dengan qty saran dan supplier master', async () => {
    const master = { id: 31, code: 'TRP001', externalCode: null, name: 'Triplex 2 mm', stock: 2, minimumStock: 10, unit: 'lembar', category: 'Lembaran', price: 1000, locationId: null, locationCode: null, supplierId: 4, supplierName: 'PT Kayu' };
    const api = installFakeApi({ ...routes, 'GET /api/v1/items': paged([master]), 'POST /api/v1/approvals': { id: 9 } });
    render(<Form basePath={basePath} />);
    fireEvent.click(await screen.findByRole('button', { name: /Rekomendasi Restock/ }));
    expect(await screen.findByText('1 barang di bawah stok minimum')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tambah Triplex 2 mm ke permintaan' }));

    expect((screen.getByLabelText('Nama Barang baris 1') as HTMLInputElement).value).toBe('Triplex 2 mm');
    expect((screen.getByLabelText('QTY baris 1') as HTMLInputElement).value).toBe('8');
    expect((screen.getByLabelText('Satuan baris 1') as HTMLInputElement).value).toBe('lembar');
    const supplier = screen.getByLabelText('Supplier baris 1') as HTMLInputElement;
    expect(supplier.value).toBe('PT Kayu');
    expect(supplier.readOnly).toBe(true);
    expect(screen.getByRole('button', { name: 'Tambah Triplex 2 mm ke permintaan' })).toHaveProperty('disabled', true);

    fillHeader();
    await chooseProject(1, 'Client');
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Permintaan Pembelian' }));
    await waitFor(() => expect(api.calls('POST /api/v1/approvals')).toHaveLength(1));
    expect((api.calls('POST /api/v1/approvals')[0].body as { payload: { items: unknown[] } }).payload.items).toEqual([{
      itemId: 31, namaBarang: 'Triplex 2 mm', satuan: 'lembar', proyek: 'Client', supplier: 'PT Kayu', qty: 8, noSpk: undefined, keterangan: undefined, tanggal: undefined, deadlineTanggal: undefined,
    }]);
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
    await chooseProject(3, 'Client');
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan Permintaan Pembelian' }));
    expect(await screen.findByText('Baris 3: Nama barang tidak valid')).toBeTruthy();
  });
});


describe('tanda tangan permintaan Gudang', () => {
  it.each(['baru', 'edit', 'revisi'])('menampilkan Kepala Gudang dan PPIC pada form %s', async (mode) => {
    installFakeApi(routes);
    render(mode === 'baru' ? <GudangForm /> : <Form permintaan={existing} basePath={basePath} editing={mode === 'edit'} />);
    await screen.findByRole('button', { name: 'Proyek baris 1' });
    expect(screen.getByText('Dibuat').textContent).toContain('Kepala Gudang');
    expect(screen.getByText('Disetujui Oleh').textContent).toContain('PPIC');
    expect(screen.queryByText('Bag. Purchasing', { selector: 'p' })).toBeNull();
  });

  it('tetap menampilkan Purchasing untuk form permintaan bagian Produksi', async () => {
    installFakeApi(routes);
    render(<Form permintaan={{ ...existing, bagian: 'Produksi' }} editing />);
    await screen.findByRole('button', { name: 'Proyek baris 1' });
    expect(screen.getByText('Disetujui Oleh').textContent).toContain('Bag. Purchasing');
  });
});
