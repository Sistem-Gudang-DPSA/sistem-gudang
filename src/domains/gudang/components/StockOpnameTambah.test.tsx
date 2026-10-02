import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import StockOpnameTambah from './StockOpnameTambah';

const push = vi.fn();
const back = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), back }),
  useParams: () => ({}),
  usePathname: () => '/gudang/stock-opname/tambah',
}));

const items = paged([
  { id: 1, code: 'BRG-1', name: 'Triplex', unit: 'lbr', category: 'Bahan Baku', stock: 10, price: 1000 },
  { id: 2, code: 'BRG-2', name: 'Paku', unit: 'kg', category: 'Bahan Baku', stock: 5, price: 200 },
]);

beforeEach(() => { push.mockClear(); back.mockClear(); });

async function setup(extra: Record<string, unknown> = {}, confirm = true) {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(confirm);
  const api = installFakeApi({ 'GET /api/v1/items': items, ...extra });
  render(<StockOpnameTambah />);
  await waitFor(() => expect(api.calls('GET /api/v1/items').length).toBe(1));
  await waitFor(() => expect(document.querySelectorAll('#stock-opname-items option').length).toBe(2));
  return { api, confirmSpy };
}
const names = () => screen.getAllByPlaceholderText('Masukkan nama barang') as HTMLInputElement[];
const qtys = () => screen.getAllByPlaceholderText('0') as HTMLInputElement[];
const notes = () => screen.getAllByPlaceholderText('Tambahkan catatan...') as HTMLInputElement[];
const fillRow = (i: number, name: string, qty: string) => {
  fireEvent.change(names()[i], { target: { value: name } });
  fireEvent.change(qtys()[i], { target: { value: qty } });
};

describe('StockOpnameTambah', () => {
  it('starts with 7 rows, add button appends, back button goes back', async () => {
    await setup();
    expect(names().length).toBe(7);
    fireEvent.click(document.querySelector('button.absolute')!);
    expect(names().length).toBe(8);
    fireEvent.click(document.querySelector('.flex.items-center.gap-3 button')!);
    expect(back).toHaveBeenCalled();
  });

  it('shows item info and derived prices after picking an item', async () => {
    await setup();
    fillRow(0, 'Triplex', '8');
    expect((screen.getAllByPlaceholderText('Unit')[0] as HTMLInputElement).value).toBe('lbr');
    expect((screen.getAllByPlaceholderText('Kategori')[0] as HTMLInputElement).value).toBe('Bahan Baku');
    expect(screen.getAllByText((8000).toLocaleString('id-ID')).length).toBeGreaterThan(0);
  });

  it('validates empty form, incomplete rows and duplicates', async () => {
    const { api, confirmSpy } = await setup();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Pilih barang dan isi jumlah fisik di setiap baris yang dipakai.')).not.toBeNull();
    fireEvent.change(names()[0], { target: { value: 'Triplex' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Pilih barang dan isi jumlah fisik di setiap baris yang dipakai.')).not.toBeNull();
    fillRow(0, 'Triplex', '5');
    fillRow(1, 'Triplex', '6');
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Satu barang hanya boleh muncul sekali per stok opname.')).not.toBeNull();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(api.calls('POST /api/v1/stock-opname').length).toBe(0);
  });

  it('input restrictions: digits only, maxLength 9 and 255', async () => {
    await setup();
    fireEvent.change(qtys()[0], { target: { value: '-1e2.5' } });
    expect(qtys()[0].value).toBe('125');
    expect(qtys()[0].maxLength).toBe(9);
    expect(notes()[0].maxLength).toBe(255);
  });

  it('does not post when confirm is cancelled', async () => {
    const { api, confirmSpy } = await setup({}, false);
    fillRow(0, 'Triplex', '8');
    fireEvent.click(screen.getByText('Simpan'));
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('1 barang'));
    expect(confirmSpy.mock.calls[0][0]).toContain('1 berbeda');
    expect(api.calls('POST /api/v1/stock-opname').length).toBe(0);
  });

  it('posts month/year/lines as integers (note omitted when empty) and redirects', async () => {
    const { api } = await setup({ 'POST /api/v1/stock-opname': { id: 1 } });
    const now = new Date();
    fillRow(0, 'Triplex', '10');
    fillRow(1, 'Paku', '0');
    fireEvent.change(notes()[1], { target: { value: 'hilang' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/stock-opname').length).toBe(1));
    expect(api.calls('POST /api/v1/stock-opname')[0].body).toEqual({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      lines: [{ itemId: 1, physicalQty: 10 }, { itemId: 2, physicalQty: 0, note: 'hilang' }],
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/gudang/transaksi/stock-opname'));
  });

  it('uses chosen month/year', async () => {
    const { api } = await setup({ 'POST /api/v1/stock-opname': { id: 1 } });
    const [month, year] = Array.from(document.querySelectorAll('select'));
    fireEvent.change(month, { target: { value: '2' } });
    fireEvent.change(year, { target: { value: String(new Date().getFullYear() - 1) } });
    fillRow(0, 'Triplex', '1');
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/stock-opname').length).toBe(1));
    const b = api.calls('POST /api/v1/stock-opname')[0].body as { month: number; year: number };
    expect(b.month).toBe(2);
    expect(b.year).toBe(new Date().getFullYear() - 1);
  });

  it('shows backend error, stays on page, disables button while saving', async () => {
    const { api } = await setup({ 'POST /api/v1/stock-opname': fail(409, 'Periode sudah ada') });
    fillRow(0, 'Triplex', '10');
    fireEvent.click(screen.getByText('Simpan'));
    const btn = screen.getByText('Menyimpan...') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(await screen.findByText('Periode sudah ada')).not.toBeNull();
    expect(push).not.toHaveBeenCalled();
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(false);
    expect(api.calls('POST /api/v1/stock-opname').length).toBe(1);
  });

  it('shows error when items fail to load', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    installFakeApi({ 'GET /api/v1/items': fail(500, 'Item error') });
    render(<StockOpnameTambah />);
    expect(await screen.findByText('Item error')).not.toBeNull();
  });
});
