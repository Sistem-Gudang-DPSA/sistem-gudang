import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import { withUser } from '@/domains/ppic/components/as-user';
import DataLokasi from './DataLokasi';
import DataSupplier from './DataSupplier';

const lokasi = { id: 3, code: 'A01', rackName: 'A', rackNumber: '01' };
const supplier = { id: 5, code: 'S1', name: 'PT Satu', bank: 'BCA', npwp: '1', phone: '08', address: 'Jl X', pajak: 'PKP' };
const lastQuery = (api: ReturnType<typeof installFakeApi>, key: string) => api.calls(key).at(-1)!.query;

describe('Data Lokasi', () => {
  it('sorts by header on the server and edits a location with PUT', async () => {
    const api = installFakeApi({ 'GET /api/v1/locations': paged([lokasi]), 'PUT /api/v1/locations/3': lokasi });
    render(withUser(<DataLokasi />, ['location.view', 'location.update']));
    await screen.findByText('A01');
    fireEvent.click(screen.getByText('Nama Rak'));
    await waitFor(() => expect(lastQuery(api, 'GET /api/v1/locations').get('sortBy')).toBe('rackName'));

    fireEvent.click(screen.getByText('Mode Edit'));
    fireEvent.change(screen.getByLabelText('Nomer rak A01'), { target: { value: '02' } });
    fireEvent.click(screen.getByText('Simpan (1)'));
    await waitFor(() => expect(api.calls('PUT /api/v1/locations/3')[0].body).toEqual({ code: 'A02', rackName: 'A', rackNumber: '02' }));
  });
});

describe('Data Lokasi keterangan', () => {
  it('shows the optional keterangan, edits or clears it in edit mode, and sorts by it', async () => {
    const api = installFakeApi({ 'GET /api/v1/locations': paged([{ ...lokasi, description: 'Rak A baris 1' }]), 'PUT /api/v1/locations/3': lokasi });
    render(withUser(<DataLokasi />, ['location.view', 'location.update']));
    expect(await screen.findByText('Rak A baris 1')).toBeTruthy();
    fireEvent.click(screen.getByText('Keterangan'));
    await waitFor(() => expect(lastQuery(api, 'GET /api/v1/locations').get('sortBy')).toBe('description'));
    fireEvent.click(screen.getByText('Mode Edit'));
    fireEvent.change(screen.getByLabelText('Keterangan A01'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Simpan (1)'));
    await waitFor(() => expect(api.calls('PUT /api/v1/locations/3')[0].body).toEqual({ code: 'A01', rackName: 'A', rackNumber: '01', description: null }));
  });

  it('creates a location with and without keterangan', async () => {
    const api = installFakeApi({ 'GET /api/v1/locations': paged([]), 'POST /api/v1/locations': lokasi });
    render(withUser(<DataLokasi />, ['location.view', 'location.create']));
    await screen.findByText('Belum ada data lokasi.');
    fireEvent.click(screen.getByText('Tambah Data'));
    const [nama, nomor] = screen.getAllByRole('combobox');
    fireEvent.change(nama, { target: { value: 'B' } });
    fireEvent.change(nomor, { target: { value: '02' } });
    fireEvent.change(screen.getByLabelText(/Keterangan/), { target: { value: ' Rak B ' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/locations')[0].body).toEqual({ code: 'B02', rackName: 'B', rackNumber: '02', description: 'Rak B' }));
  });
});

describe('Data Supplier', () => {
  it('sorts by header and filters by pajak on the server; Reset clears both', async () => {
    const api = installFakeApi({ 'GET /api/v1/suppliers': paged([supplier]) });
    render(withUser(<DataSupplier />, ['supplier.view', 'supplier.update']));
    await screen.findByText('PT Satu');
    fireEvent.click(screen.getByText('Nama Supplier'));
    await waitFor(() => expect(lastQuery(api, 'GET /api/v1/suppliers').get('sortBy')).toBe('name'));
    fireEvent.change(screen.getByLabelText('Filter pajak'), { target: { value: 'NON_PKP' } });
    await waitFor(() => expect(lastQuery(api, 'GET /api/v1/suppliers').get('pajak')).toBe('NON_PKP'));
    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => expect(lastQuery(api, 'GET /api/v1/suppliers').get('pajak')).toBeNull());
    expect(lastQuery(api, 'GET /api/v1/suppliers').get('sortBy')).toBeNull();
    expect(within(screen.getByRole('table')).getByText('PT Satu')).toBeTruthy();
  });

  it('edits fields in edit mode and saves only the changed ones with PUT', async () => {
    const api = installFakeApi({ 'GET /api/v1/suppliers': paged([supplier]), 'PUT /api/v1/suppliers/5': supplier });
    render(withUser(<DataSupplier />, ['supplier.view', 'supplier.update']));
    await screen.findByText('PT Satu');
    expect(screen.queryByLabelText('bank PT Satu')).toBeNull();
    fireEvent.click(screen.getByText('Mode Edit'));
    fireEvent.change(screen.getByLabelText('bank PT Satu'), { target: { value: 'Mandiri' } });
    fireEvent.change(screen.getByLabelText('pajak PT Satu'), { target: { value: 'NON_PKP' } });
    fireEvent.click(screen.getByText('Simpan (1)'));
    await waitFor(() => expect(api.calls('PUT /api/v1/suppliers/5')[0].body).toEqual({ bank: 'Mandiri', pajak: 'NON_PKP' }));
  });
});
