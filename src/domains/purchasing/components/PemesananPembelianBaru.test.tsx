import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { fail, installFakeApi, paged, type FakeRequest } from '@/test/fake-api';
import PemesananPembelianBaru from './PemesananPembelianBaru';
import { withUser } from '@/test/as-user';

const print = vi.hoisted(() => ({ printPurchaseOrder: vi.fn(async () => {}) }));
vi.mock('@/domains/purchasing/export/print-po', () => print);
beforeEach(() => { print.printPurchaseOrder.mockReset(); print.printPurchaseOrder.mockResolvedValue(undefined); });

vi.mock('next/navigation', () => ({ useParams: () => ({}), useRouter: () => ({ push: vi.fn() }), usePathname: () => '/' }));

const suppliers = paged([{ id: 3, code: 'S3', name: 'PT Kayu', bank: '-', npwp: '-', phone: '1', address: 'Jl', pajak: 'PKP' }]);

describe('PemesananPembelianBaru', () => {
  it('disables saving and printing without purchase-order.create', () => {
    const api = installFakeApi({ 'GET /api/v1/suppliers': suppliers, 'GET /api/v1/tracking/spk': [], 'GET /api/v1/items': paged([]) });
    render(withUser(<PemesananPembelianBaru />, ['purchase-order.view']));
    const button = screen.getByRole('button', { name: 'Cetak + Buat Purchase Order' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(0);
    expect(print.printPurchaseOrder).not.toHaveBeenCalled();
  });

  it('displays item code and unit as plain text filled by the material dropdown', async () => {
    installFakeApi({
      'GET /api/v1/suppliers': suppliers,
      'GET /api/v1/tracking/spk': [],
      'GET /api/v1/items': paged([{ id: 7, code: 'BRG-007', name: 'Paku', unit: 'Kg' }]),
    });
    render(<PemesananPembelianBaru />);
    expect(screen.queryByPlaceholderText('Kode barang')).toBeNull();
    expect(screen.queryByPlaceholderText('Pcs, unit, dll.')).toBeNull();
    const name = screen.getByPlaceholderText('Ketik nama barang...');
    const cells = within(name.closest('tr')!).getAllByRole('cell');
    const code = cells[1];
    const unit = cells[3];
    expect(code.textContent?.trim()).toBe('');
    expect(unit.textContent?.trim()).toBe('');
    expect(code.querySelector('input')).toBeNull();
    expect(unit.querySelector('input')).toBeNull();
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(await screen.findByRole('option', { name: 'PT Kayu' }));
    fireEvent.focus(name);
    fireEvent.mouseDown(await screen.findByRole('button', { name: /Paku.*BRG-007/ }));
    expect(code.textContent?.trim()).toBe('BRG-007');
    expect(unit.textContent?.trim()).toBe('Kg');
    fireEvent.change(name, { target: { value: 'Lem' } });
    expect(code.textContent?.trim()).toBe('');
    expect(unit.textContent?.trim()).toBe('');
  });

  it.each(['mouse', 'keyboard'])('fills the item price from Data Barang via %s and recalculates the total', async (selection) => {
    installFakeApi({
      'GET /api/v1/suppliers': suppliers,
      'GET /api/v1/tracking/spk': [],
      'GET /api/v1/items': paged([{ id: 7, code: 'BRG-007', name: 'Paku', unit: 'Kg', price: 12500 }]),
    });
    render(<PemesananPembelianBaru />);
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(await screen.findByRole('option', { name: 'PT Kayu' }));
    const name = screen.getByPlaceholderText('Ketik nama barang...');
    const cells = within(name.closest('tr')!).getAllByRole('cell');
    const price = within(cells[5]).getByRole('textbox') as HTMLInputElement;
    fireEvent.focus(name);
    const option = await screen.findByRole('button', { name: /Paku.*BRG-007/ });
    if (selection === 'mouse') fireEvent.mouseDown(option);
    else fireEvent.keyDown(option, { key: 'Enter' });
    expect(price.value).toBe('12500');
    fireEvent.change(within(cells[4]).getByRole('textbox'), { target: { value: '2' } });
    expect(cells[7].textContent?.trim()).toBe('Rp 25.000');
    fireEvent.change(name, { target: { value: 'Lem' } });
    expect(price.value).toBe('');
    fireEvent.mouseDown(await screen.findByRole('button', { name: /Paku.*BRG-007/ }));
    expect(price.value).toBe('12500');
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(screen.getByRole('option', { name: 'PT Kayu' }));
    expect(price.value).toBe('');
  });

  it.each(['Hotel', 'Kebutuhan internal gudang'])('saves a direct PO with project/need %s without an approval ID', async (need) => {
    const api = installFakeApi({
      'GET /api/v1/suppliers': suppliers,
      'GET /api/v1/tracking/spk': [{ noSpk: 'SPK-1', client: 'Client', projectName: 'Hotel' }],
      'GET /api/v1/items': paged([{ id: 7, code: 'BRG-007', name: 'Paku', unit: 'Kg', price: 2000 }]),
      'POST /api/v1/purchase-orders': { id: 1, nomorPo: 'PO-001', approvalRequestId: null, kebutuhanProyek: need, supplierName: 'PT Kayu', grandTotal: 2220 },
    });
    render(<PemesananPembelianBaru />);
    fireEvent.change(screen.getByLabelText('Tanggal PO'), { target: { value: '2026-11-20' } });
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(await screen.findByRole('option', { name: 'PT Kayu' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Kebutuhan Proyek' }), { target: { value: need } });
    fireEvent.focus(screen.getByPlaceholderText('Ketik nama barang...'));
    fireEvent.mouseDown(await screen.findByRole('button', { name: /Paku.*BRG-007/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cetak + Buat Purchase Order' }));
    await screen.findByText('PO PO-001 berhasil dibuat');
    expect(api.calls('POST /api/v1/purchase-orders')[0].body).toEqual({
      tanggalPo: '2026-11-20', supplierId: 3, picSupplier: 'Budi / 081200000003', kebutuhanProyek: need,
      barang: [{ kodeBarang: 'BRG-007', namaBarang: 'Paku', satuan: 'Kg', jumlah: 1, hargaSatuan: 2000, diskon: 0 }],
      persenPpn: 12, jasa: 0,
    });
    expect(api.calls('POST /api/v1/approvals')).toHaveLength(0);
    expect(print.printPurchaseOrder).toHaveBeenCalledOnce();
    expect(print.printPurchaseOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 1, nomorPo: 'PO-001', kebutuhanProyek: need }));
  });

  it.each([false, true])('prints only saved POs and retries printing without a second save when print fails=%s', async (printFails) => {
    const api = installFakeApi({
      'GET /api/v1/suppliers': suppliers,
      'GET /api/v1/tracking/spk': [],
      'GET /api/v1/items': paged([{ id: 7, code: 'BRG-007', name: 'Paku', unit: 'Kg', price: 2000 }]),
      'POST /api/v1/purchase-orders': printFails
        ? { id: 2, nomorPo: 'PO-002', supplierName: 'PT Kayu', grandTotal: 2220 }
        : fail(400, 'PO gagal disimpan'),
    });
    if (printFails) print.printPurchaseOrder.mockRejectedValueOnce(new Error('Printer gagal'));
    render(<PemesananPembelianBaru />);
    fireEvent.change(screen.getByLabelText('Tanggal PO'), { target: { value: '2026-11-20' } });
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(await screen.findByRole('option', { name: 'PT Kayu' }));
    fireEvent.focus(screen.getByPlaceholderText('Ketik nama barang...'));
    fireEvent.mouseDown(await screen.findByRole('button', { name: /Paku.*BRG-007/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cetak + Buat Purchase Order' }));
    if (printFails) {
      await screen.findByText('PO PO-002 berhasil dibuat');
      expect((await screen.findByRole('alert')).textContent).toContain('PO sudah tersimpan');
      fireEvent.click(screen.getByRole('button', { name: 'Cetak Ulang PO' }));
      await waitFor(() => expect(print.printPurchaseOrder).toHaveBeenCalledTimes(2));
      expect(api.calls('POST /api/v1/purchase-orders')).toHaveLength(1);
      await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    } else {
      await screen.findByText('PO gagal disimpan');
      expect(print.printPurchaseOrder).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Cetak Ulang PO' })).toBeNull();
    }
  });

  it('displays PIC/Telp as text without a dropdown or editable input', () => {
    installFakeApi({ 'GET /api/v1/suppliers': suppliers, 'GET /api/v1/tracking/spk': [] });
    render(<PemesananPembelianBaru />);
    expect(screen.queryByRole('combobox', { name: 'PIC / Telp' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'PIC / Telp' })).toBeNull();
    expect(screen.getByRole('row', { name: 'PIC / Telp -' })).toBeTruthy();
  });

  it('fills supplier details and PIC/Telp text immediately when selecting or changing suppliers', async () => {
    const first = { ...suppliers.rows[0], bank: 'Bank A', npwp: '123456' };
    const second = { ...first, id: 4, name: 'PT Besi', address: 'Jl Besi', phone: '987', bank: 'Bank B', npwp: '654321' };
    installFakeApi({
      'GET /api/v1/suppliers': paged([first, second]),
      'GET /api/v1/tracking/spk': [],
      'GET /api/v1/items': paged([]),
    });
    render(<PemesananPembelianBaru />);
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(await screen.findByRole('option', { name: 'PT Kayu' }));
    expect(screen.getByText('Jl / 1')).toBeTruthy();
    expect(screen.getByText('Bank A')).toBeTruthy();
    expect(screen.getByText('123456')).toBeTruthy();
    expect(screen.getByText('Budi / 081200000003')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(screen.getByRole('option', { name: 'PT Kayu' }));
    expect(screen.getByText('Budi / 081200000003')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(screen.getByRole('option', { name: 'PT Besi' }));
    expect(screen.getByText('Jl Besi / 987')).toBeTruthy();
    expect(screen.getByText('Bank B')).toBeTruthy();
    expect(screen.getByText('654321')).toBeTruthy();
    expect(screen.getByText('Dewi / 081200000004')).toBeTruthy();
    expect(screen.queryByText('Budi / 081200000003')).toBeNull();
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(screen.getByRole('option', { name: 'PT Kayu' }));
    expect(screen.getByText('Budi / 081200000003')).toBeTruthy();
    expect(screen.queryByText('Dewi / 081200000004')).toBeNull();
  });

  it('offers unique projects from Daftar Proyek and accepts a manual internal need', async () => {
    const api = installFakeApi({ 'GET /api/v1/suppliers': suppliers, 'GET /api/v1/tracking/spk': [
      { noSpk: 'S1', client: 'A', projectName: 'Hotel' },
      { noSpk: 'S2', client: 'B', projectName: 'Hotel' },
      { noSpk: 'S3', client: 'A', projectName: 'Kantor' },
      { noSpk: 'S4', client: 'A' },
    ] });
    render(<PemesananPembelianBaru />);
    const input = screen.getByRole('combobox', { name: 'Kebutuhan Proyek' }) as HTMLInputElement;
    const options = () => [...document.querySelectorAll<HTMLDataListElement>('#po-daftar-proyek option')].map((o) => o.getAttribute('value'));
    await waitFor(() => expect(options()).toEqual(['Hotel', 'Kantor']));
    expect(input.getAttribute('list')).toBe('po-daftar-proyek');
    fireEvent.change(input, { target: { value: 'Hotel' } });
    expect(input.value).toBe('Hotel');
    fireEvent.change(input, { target: { value: 'Perawatan gudang internal' } });
    expect(input.value).toBe('Perawatan gudang internal');
    expect(api.calls('GET /api/v1/tracking/spk')[0].query.has('limit')).toBe(false);
  });

  it('still permits manual needs when tracking fails', async () => {
    installFakeApi({ 'GET /api/v1/suppliers': suppliers, 'GET /api/v1/tracking/spk': fail(500, 'Tracking tidak tersedia') });
    render(<PemesananPembelianBaru />);
    await screen.findByRole('alert');
    const input = screen.getByRole('combobox', { name: 'Kebutuhan Proyek' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Stok internal' } });
    expect(input.value).toBe('Stok internal');
  });

  it('PPN accepts decimals with comma or dot, stored with a dot', () => {
    installFakeApi({ 'GET /api/v1/suppliers': suppliers, 'GET /api/v1/tracking/spk': [] });
    render(<PemesananPembelianBaru />);
    const ppn = screen.getByLabelText('PPN (%)') as HTMLInputElement;
    fireEvent.change(ppn, { target: { value: '11,5' } });
    expect(ppn.value).toBe('11.5');
  });

  it('searches items on the server filtered by the chosen supplier', async () => {
    const api = installFakeApi({ 'GET /api/v1/suppliers': suppliers, 'GET /api/v1/tracking/spk': [], 'GET /api/v1/items': paged([]) });
    render(<PemesananPembelianBaru />);
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(await screen.findByText('PT Kayu'));
    await vi.waitFor(() => expect(api.calls('GET /api/v1/items').some((c) => c.query.get('supplierId') === '3')).toBe(true));
  });

  it('keeps the selected supplier and restores all choices when reopening after a search', async () => {
    const api = installFakeApi({ 'GET /api/v1/suppliers': suppliers, 'GET /api/v1/tracking/spk': [], 'GET /api/v1/items': paged([]) });
    render(<PemesananPembelianBaru />);
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(await screen.findByRole('option', { name: 'PT Kayu' }));
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.change(screen.getByLabelText('Cari Data Supplier'), { target: { value: 'zzz' } });
    expect(screen.queryByRole('option', { name: 'PT Kayu' })).toBeNull();
    expect(screen.getByLabelText('Data Supplier').textContent).toBe('PT Kayu');
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    fireEvent.click(screen.getByRole('option', { name: 'PT Kayu' }));
    expect(screen.getByLabelText('Data Supplier').textContent).toBe('PT Kayu');
    expect(api.calls('GET /api/v1/suppliers')).toHaveLength(1);
  });

  it('shows every supplier including later pages without typing a search first', async () => {
    const all = Array.from({ length: 101 }, (_, i) => ({ ...suppliers.rows[0], id: i + 1, name: `Supplier ${i + 1}` }));
    const api = installFakeApi({
      'GET /api/v1/suppliers': (req: FakeRequest) => {
        const page = Number(req.query.get('page'));
        const pageSize = Number(req.query.get('pageSize'));
        return paged(all.slice((page - 1) * pageSize, page * pageSize), { total: all.length, page, pageSize });
      },
      'GET /api/v1/tracking/spk': [],
      'GET /api/v1/items': paged([]),
    });
    render(<PemesananPembelianBaru />);
    fireEvent.click(screen.getByLabelText('Data Supplier'));
    await screen.findByRole('option', { name: 'Supplier 101' });
    expect(within(screen.getByRole('listbox', { name: 'Pilihan Data Supplier' })).getAllByRole('option')).toHaveLength(101);
    expect(api.calls('GET /api/v1/suppliers').map((r) => r.query.get('page'))).toEqual(['1', '2']);
    fireEvent.change(screen.getByLabelText('Cari Data Supplier'), { target: { value: 'Supplier 101' } });
    expect(within(screen.getByRole('listbox', { name: 'Pilihan Data Supplier' })).getAllByRole('option')).toHaveLength(1);
    fireEvent.click(screen.getByRole('option', { name: 'Supplier 101' }));
    expect(screen.getByLabelText('Data Supplier').textContent).toBe('Supplier 101');
    expect(api.calls('GET /api/v1/suppliers')).toHaveLength(2);
  });
});
