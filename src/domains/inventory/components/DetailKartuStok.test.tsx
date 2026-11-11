import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { fail, installFakeApi } from '@/test/fake-api';
import { exportKartuExcel, printKartuPdf } from '@/shared/components/ExportStok';
import { todayIso } from '../date';
import type { KartuEntry, KartuStokData } from './KartuStok';
import DetailKartuStok from './DetailKartuStok';

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '7' }) }));
vi.mock('@/shared/components/ExportStok', () => ({ exportKartuExcel: vi.fn(), printKartuPdf: vi.fn() }));

const today = todayIso();
const monthStart = `${today.slice(0, 7)}-01`;
const previous = new Date(`${monthStart}T12:00:00Z`);
previous.setUTCDate(0);
const previousDate = previous.toISOString().slice(0, 10);
const entry = (id: string, hour: number, over: Partial<KartuEntry> = {}): KartuEntry => ({
  id, date: today, createdAt: `${today}T0${hour}:00:00Z`, type: 'KELUAR',
  project: 'Kursi tamu', client: 'CV Tiga Saudara', spk: 'SPK-005',
  noTransaksi: id.toUpperCase(), usage: 'Pengambilan oleh Pak Mul', qtyIn: 0, qtyOut: 0, note: null,
  ...over,
});
const data: KartuStokData = {
  item: { id: 7, code: 'BRG-7', name: 'Triplex 2mm', unit: 'Lembar', stock: 116 },
  openingBalance: 100,
  entries: [
    entry('out-3', 4, { qtyOut: 4, usage: 'Pengambilan oleh Pak Lain' }),
    entry('prior', 0, { date: previousDate, createdAt: `${previousDate}T00:00:00Z`, type: 'MASUK', qtyIn: 10, project: null, client: null }),
    entry('out-1', 2, { qtyOut: 5 }),
    entry('out-4', 5, { qtyOut: 2, client: 'CV Sinar Abadi' }),
    entry('in-1', 1, { type: 'MASUK', qtyIn: 20, project: null, client: null, usage: 'Penerimaan dari supplier' }),
    entry('out-2', 3, { qtyOut: 3, project: 'Lemari kantor', client: 'CV Sinar Abadi', spk: 'SPK-002' }),
  ],
};

function setup(response: unknown = data) {
  const api = installFakeApi({ 'GET /api/v1/items/7/stock-card': response });
  render(<DetailKartuStok />);
  return api;
}
const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const rowFor = (text: string) => screen.getByText(text).closest('tr')!;
async function openFilters() {
  await screen.findByText('OUT-1');
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
}

beforeEach(() => vi.clearAllMocks());

describe('Kartu Stok detail filters', () => {
  it('starts with all dates and separates text filters from the date period', async () => {
    setup();
    await screen.findByText('OUT-1');
    expect(screen.getByText('PRIOR')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter Tanggal' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    expect(screen.getByLabelText('Nama Proyek/Item')).toBeTruthy();
    expect(screen.getByLabelText('Penggunaan')).toBeTruthy();
    expect(screen.queryByLabelText('Dari tanggal')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Filter Tanggal' }));
    expect((screen.getByLabelText('Dari tanggal') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Sampai tanggal') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Semua tanggal')).toBeTruthy();
    expect(within(rowFor('Saldo awal')).getAllByRole('cell')[3].textContent).toBe('100');
  });

  it('filters project/item and the visible Penggunaan column together, ignoring case and outer spaces', async () => {
    const api = setup();
    await openFilters();
    change('Nama Proyek/Item', ' KURSI ');
    expect(screen.queryByText('OUT-2')).toBeNull();
    expect(screen.getByText('OUT-1')).toBeTruthy();
    expect(screen.getByText('OUT-3')).toBeTruthy();
    expect(screen.getByText('OUT-4')).toBeTruthy();
    change('Penggunaan', ' tiga saudara ');
    expect(screen.queryByText('OUT-4')).toBeNull();
    expect(screen.getByText('OUT-1')).toBeTruthy();
    expect(screen.getByText('OUT-3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter (2)' })).toBeTruthy();
    expect(api.calls('GET /api/v1/items/7/stock-card')).toHaveLength(1);
  });

  it('preserves transaction balances across hidden movements and totals only matching rows', async () => {
    setup();
    await openFilters();
    fireEvent.click(screen.getByRole('button', { name: 'Filter Tanggal' }));
    change('Dari tanggal', monthStart);
    change('Sampai tanggal', today);
    change('Nama Proyek/Item', 'Kursi');
    change('Penggunaan', 'Tiga');
    expect(within(rowFor('Saldo awal')).getAllByRole('cell')[3].textContent).toBe('110');
    expect(within(rowFor('OUT-1')).getAllByRole('cell')[6].textContent).toBe('125');
    expect(within(rowFor('OUT-3')).getAllByRole('cell')[6].textContent).toBe('118');
    const total = within(rowFor('Total hasil filter / Saldo akhir periode')).getAllByRole('cell');
    expect(total[1].textContent).toBe('0');
    expect(total[2].textContent).toBe('9');
    expect(total[3].textContent).toBe('116');
    expect(screen.queryByText(/berbeda dari stok barang/)).toBeNull();
  });

  it('matches Penggunaan against the displayed company rather than the taker in Keterangan', async () => {
    setup();
    await openFilters();
    change('Penggunaan', 'Pak Mul');
    expect(screen.getByText('Tidak ada mutasi yang sesuai filter.')).toBeTruthy();
    change('Penggunaan', 'Sinar');
    expect(screen.getByText('OUT-2')).toBeTruthy();
    expect(screen.getByText('OUT-4')).toBeTruthy();
    expect(screen.queryByText('OUT-1')).toBeNull();
    expect(screen.queryByText('OUT-3')).toBeNull();
  });

  it('combines both panels, retains their values when closed, and resets each independently', async () => {
    setup();
    await openFilters();
    fireEvent.click(screen.getByRole('button', { name: 'Filter Tanggal' }));
    change('Dari tanggal', today);
    change('Sampai tanggal', today);
    change('Nama Proyek/Item', 'Kursi');
    change('Penggunaan', 'Tiga');
    fireEvent.click(screen.getByRole('button', { name: 'Filter (2)' }));
    expect(screen.queryByLabelText('Penggunaan')).toBeNull();
    expect(screen.getByLabelText('Dari tanggal')).toBeTruthy();
    expect(screen.queryByText('OUT-2')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Filter (2)' }));
    expect((screen.getByLabelText('Penggunaan') as HTMLInputElement).value).toBe('Tiga');
    fireEvent.click(screen.getByRole('button', { name: 'Filter Tanggal' }));
    expect(screen.queryByLabelText('Dari tanggal')).toBeNull();
    expect(screen.queryByText('OUT-2')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Filter Tanggal' }));
    expect((screen.getByLabelText('Dari tanggal') as HTMLInputElement).value).toBe(today);

    fireEvent.click(screen.getByRole('button', { name: 'Reset filter' }));
    expect((screen.getByLabelText('Nama Proyek/Item') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Penggunaan') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Dari tanggal') as HTMLInputElement).value).toBe(today);
    expect((screen.getByLabelText('Sampai tanggal') as HTMLInputElement).value).toBe(today);
    expect(screen.queryByText('PRIOR')).toBeNull();
    expect(screen.getByText('OUT-2')).toBeTruthy();

    change('Nama Proyek/Item', 'Kursi');
    change('Penggunaan', 'Tiga');
    fireEvent.click(screen.getByRole('button', { name: 'Reset tanggal' }));
    expect((screen.getByLabelText('Dari tanggal') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Sampai tanggal') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Nama Proyek/Item') as HTMLInputElement).value).toBe('Kursi');
    expect((screen.getByLabelText('Penggunaan') as HTMLInputElement).value).toBe('Tiga');
    expect(screen.queryByText('OUT-2')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filter' }));
    expect(screen.getByText('PRIOR')).toBeTruthy();
    expect(screen.getByText('OUT-2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy();
  });

  it('exports the matching transactions with their actual balances and period opening balance', async () => {
    setup();
    await openFilters();
    fireEvent.click(screen.getByRole('button', { name: 'Filter Tanggal' }));
    change('Dari tanggal', monthStart);
    change('Sampai tanggal', today);
    change('Nama Proyek/Item', 'Kursi');
    change('Penggunaan', 'Tiga');
    fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print PDF' }));
    const [exportData, exportSummary] = vi.mocked(exportKartuExcel).mock.calls[0];
    expect(exportData.openingBalance).toBe(110);
    expect(exportData.entries.map((row) => row.id)).toEqual(['out-1', 'out-3']);
    expect(exportSummary?.rows.map((row) => row.saldo)).toEqual([125, 118]);
    expect(exportSummary).toMatchObject({ totalIn: 0, totalOut: 9, saldoAkhir: 116 });
    expect(printKartuPdf).toHaveBeenCalledWith(exportData, exportSummary);
  });

  it('still applies text filters when a date range is reversed', async () => {
    setup();
    await openFilters();
    fireEvent.click(screen.getByRole('button', { name: 'Filter Tanggal' }));
    change('Sampai tanggal', today);
    change('Dari tanggal', `${Number(today.slice(0, 4)) + 1}-01-01`);
    change('Nama Proyek/Item', 'Lemari');
    expect(screen.getByRole('alert').textContent).toContain('Filter tanggal diabaikan');
    expect(screen.getByText('OUT-2')).toBeTruthy();
    expect(screen.queryByText('OUT-1')).toBeNull();
  });

  it.each([
    ['Dari tanggal', today, 'OUT-1', 'PRIOR', '110'],
    ['Sampai tanggal', previousDate, 'PRIOR', 'OUT-1', '100'],
  ])('supports an open-ended period using only %s without changing the Filter count', async (label, date, visible, hidden, opening) => {
    setup();
    await screen.findByText('OUT-1');
    fireEvent.click(screen.getByRole('button', { name: 'Filter Tanggal' }));
    change(label, date);
    expect(screen.getByText(visible)).toBeTruthy();
    expect(screen.queryByText(hidden)).toBeNull();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeTruthy();
    expect(within(rowFor('Saldo awal')).getAllByRole('cell')[3].textContent).toBe(opening);
    fireEvent.click(screen.getByRole('button', { name: 'Reset tanggal' }));
    expect(screen.getByText('PRIOR')).toBeTruthy();
    expect(screen.getByText('OUT-1')).toBeTruthy();
  });

  it('shows loading errors and disables exports', async () => {
    setup(fail(500, 'Gagal mengambil kartu stok'));
    await screen.findByText('Gagal mengambil kartu stok');
    await waitFor(() => expect((screen.getByRole('button', { name: 'Export Excel' }) as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByRole('button', { name: 'Print PDF' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
