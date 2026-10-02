import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import DataSupplier from './DataSupplier';

vi.setConfig({ testTimeout: 20000 });

const sup = (id: number, over = {}) => ({ id, code: `S${id}`, name: `PT Supplier ${id}`, bank: 'BCA', npwp: '01.234', phone: '0812', address: 'Jl. Mawar', pajak: 'NON_PKP', ...over });

function setup(routes: Record<string, unknown> = {}) {
  const api = installFakeApi({ 'GET /api/v1/suppliers': paged([sup(1), sup(2, { pajak: 'PKP' })]), ...routes });
  render(<DataSupplier />);
  return api;
}
const ph = (p: string) => screen.getByPlaceholderText(p) as HTMLInputElement;
const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/suppliers').at(-1)!.query;

async function openAdd(api: ReturnType<typeof installFakeApi>) {
  await screen.findByText('PT Supplier 1');
  fireEvent.click(screen.getByText('Tambah Data'));
  await screen.findByText('Kode Supplier');
  return api;
}
function fillAll() {
  fireEvent.change(ph('Masukan kode supplier'), { target: { value: 'SUP-9' } });
  fireEvent.change(ph('Masukan nama supplier'), { target: { value: 'PT Baru' } });
  fireEvent.change(ph('Masukan nama Bank'), { target: { value: 'Mandiri' } });
  fireEvent.change(ph('Masukan Npwp'), { target: { value: '99.888' } });
  fireEvent.change(ph('Masukan no telepon'), { target: { value: '021 555' } });
  fireEvent.change(ph('Masukan alamat'), { target: { value: 'Jl. Baru 1' } });
}

describe('DataSupplier list', () => {
  it('renders rows with pajak label and requests page 1 pageSize 20', async () => {
    const api = setup();
    expect(await screen.findByText('PT Supplier 1')).not.toBeNull();
    expect(screen.getByText('PKP')).not.toBeNull();
    expect(screen.getByText('Non PKP')).not.toBeNull();
    expect(lastQuery(api).get('page')).toBe('1');
    expect(lastQuery(api).get('pageSize')).toBe('20');
  });

  it('links Detail Barang to the supplier detail route', async () => {
    setup();
    await screen.findByText('PT Supplier 1');
    const hrefs = screen.getAllByText('Detail Barang').map((a) => a.getAttribute('href'));
    expect(hrefs[0]).toBe('/dashboard/purchasing/master/data-supplier/1/detail');
  });

  it('goes to page 2 and search resets page to 1', async () => {
    const api = setup({ 'GET /api/v1/suppliers': paged([sup(1)], { total: 45 }) });
    await screen.findByText('PT Supplier 1');
    fireEvent.click(screen.getByText('2'));
    await waitFor(() => expect(lastQuery(api).get('page')).toBe('2'));
    fireEvent.change(ph('Cari supplier, npwp, atau kode...'), { target: { value: 'kayu' } });
    await waitFor(() => expect(lastQuery(api).get('search')).toBe('kayu'));
    expect(lastQuery(api).get('page')).toBe('1');
  });

  it('shows empty state and load error', async () => {
    setup({ 'GET /api/v1/suppliers': paged([]) });
    expect(await screen.findByText('Belum ada data supplier.')).not.toBeNull();
  });

  it('shows backend load error', async () => {
    setup({ 'GET /api/v1/suppliers': fail(500, 'DB mati') });
    expect(await screen.findByText('DB mati')).not.toBeNull();
  });
});

describe('DataSupplier form', () => {
  it('create sends all fields incl. pajak NON_PKP default and PKP when chosen', async () => {
    const api = await openAdd(setup({ 'POST /api/v1/suppliers': (r: { body: unknown }) => ({ id: 9, ...(r.body as object) }) }));
    fillAll();
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/suppliers')).toHaveLength(1));
    expect(api.calls('POST /api/v1/suppliers')[0].body).toEqual({ code: 'SUP-9', name: 'PT Baru', bank: 'Mandiri', npwp: '99.888', phone: '021 555', address: 'Jl. Baru 1', pajak: 'NON_PKP' });
    await waitFor(() => expect(screen.queryByText('Kode Supplier')).toBeNull());
    // list reloaded
    expect(api.calls('GET /api/v1/suppliers').length).toBeGreaterThan(1);

    fireEvent.click(screen.getByText('Tambah Data'));
    await screen.findByText('Kode Supplier');
    fillAll();
    fireEvent.change(screen.getByLabelText('Pajak Vendor'), { target: { value: 'PKP' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/suppliers')).toHaveLength(2));
    expect((api.calls('POST /api/v1/suppliers')[1].body as { pajak: string }).pajak).toBe('PKP');
  });

  it('requires all fields', async () => {
    const api = await openAdd(setup());
    fireEvent.change(ph('Masukan kode supplier'), { target: { value: 'X' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Data belum lengkap!')).not.toBeNull();
    expect(api.calls('POST /api/v1/suppliers')).toHaveLength(0);
  });

  it('edit prefills and PUTs all fields including pajak', async () => {
    const api = setup({ 'PUT /api/v1/suppliers/2': { id: 2 } });
    await screen.findByText('PT Supplier 2');
    fireEvent.click(screen.getAllByText('Edit')[1]);
    await screen.findByText('Kode Supplier');
    expect(ph('Masukan kode supplier').value).toBe('S2');
    expect((screen.getByLabelText('Pajak Vendor') as HTMLSelectElement).value).toBe('PKP');
    fireEvent.change(ph('Masukan nama supplier'), { target: { value: 'PT Ganti' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/suppliers/2')).toHaveLength(1));
    expect(api.calls('PUT /api/v1/suppliers/2')[0].body).toEqual({ code: 'S2', name: 'PT Ganti', bank: 'BCA', npwp: '01.234', phone: '0812', address: 'Jl. Mawar', pajak: 'PKP' });
  });

  it('filters npwp to digits . - and phone to digits space + - ( )', async () => {
    await openAdd(setup());
    fireEvent.change(ph('Masukan Npwp'), { target: { value: 'ab12.3-4/5 x' } });
    expect(ph('Masukan Npwp').value).toBe('12.3-45');
    fireEvent.change(ph('Masukan no telepon'), { target: { value: '+62 (21) 55-5a/b.' } });
    expect(ph('Masukan no telepon').value).toBe('+62 (21) 55-5');
  });

  it('has the maxLength limits', async () => {
    await openAdd(setup());
    expect(ph('Masukan kode supplier').maxLength).toBe(20);
    expect(ph('Masukan nama supplier').maxLength).toBe(191);
    expect(ph('Masukan nama Bank').maxLength).toBe(100);
    expect(ph('Masukan alamat').maxLength).toBe(255);
    expect(ph('Masukan Npwp').maxLength).toBe(50);
    expect(ph('Masukan no telepon').maxLength).toBe(30);
  });

  it('shows backend error in the modal and keeps it open', async () => {
    await openAdd(setup({ 'POST /api/v1/suppliers': fail(409, 'Kode supplier sudah dipakai') }));
    fillAll();
    fireEvent.click(screen.getByText('Simpan'));
    expect(await screen.findByText('Kode supplier sudah dipakai')).not.toBeNull();
    expect(screen.getByText('Kode Supplier')).not.toBeNull();
  });

  it('Batal closes the modal', async () => {
    await openAdd(setup());
    fireEvent.click(screen.getByText('Batal'));
    expect(screen.queryByText('Kode Supplier')).toBeNull();
  });
});

describe('DataSupplier delete', () => {
  it('does nothing when confirm is cancelled', async () => {
    const api = setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await screen.findByText('PT Supplier 1');
    fireEvent.click(screen.getAllByText('Hapus')[0]);
    expect(api.calls('DELETE /api/v1/suppliers/1')).toHaveLength(0);
  });

  it('deletes and reloads when confirmed', async () => {
    const api = setup({ 'DELETE /api/v1/suppliers/1': { id: 1 } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await screen.findByText('PT Supplier 1');
    const before = api.calls('GET /api/v1/suppliers').length;
    fireEvent.click(screen.getAllByText('Hapus')[0]);
    await waitFor(() => expect(api.calls('DELETE /api/v1/suppliers/1')).toHaveLength(1));
    await waitFor(() => expect(api.calls('GET /api/v1/suppliers').length).toBeGreaterThan(before));
  });

  it('shows backend delete error', async () => {
    setup({ 'DELETE /api/v1/suppliers/1': fail(409, 'Supplier masih dipakai') });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await screen.findByText('PT Supplier 1');
    fireEvent.click(screen.getAllByText('Hapus')[0]);
    expect(await screen.findByText('Supplier masih dipakai')).not.toBeNull();
  });
});
