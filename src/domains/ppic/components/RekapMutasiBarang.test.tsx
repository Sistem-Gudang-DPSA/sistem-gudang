import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import RekapMutasiBarang from './RekapMutasiBarang';

const m = (id: string, tanggal: string, tipe: 'Masuk' | 'Keluar', qty: number, lokasi: string, ref = `SPK-${id}`) => ({
  id, tanggal, noReferensiSpk: ref, kodeBarang: `KB-${id}`, namaItem: `Item ${id}`, tipe, qty, lokasi,
});
const rows = [
  m('in-1', '2026-03-05', 'Masuk', 1000, 'A-01'),
  m('out-2', '2026-04-10', 'Keluar', 250, 'B-02'),
  m('in-3', '2026-04-20', 'Masuk', 50, 'A-01'),
];
const bodyRows = () => screen.getAllByRole('row').slice(1);
const setVal = (l: string, v: string) => fireEvent.change(screen.getByLabelText(l), { target: { value: v } });

describe('RekapMutasiBarang', () => {
  it('loads rows and summary totals', async () => {
    const api = installFakeApi({ 'GET /api/v1/reports/mutations': paged(rows) });
    render(<RekapMutasiBarang />);
    expect(await screen.findByText('SPK-in-1')).toBeTruthy();
    expect(api.calls('GET /api/v1/reports/mutations')[0].query.get('pageSize')).toBe('100');
    expect(screen.getByText('3 Transaksi')).toBeTruthy();
    expect(screen.getByText('+ 1.050 Unit')).toBeTruthy();
    expect(screen.getByText('− 250 Unit')).toBeTruthy();
    expect(bodyRows()).toHaveLength(3);
    expect(screen.getByText('KB-out-2')).toBeTruthy();
  });

  it('empty state with zero summary', async () => {
    installFakeApi({ 'GET /api/v1/reports/mutations': paged([]) });
    render(<RekapMutasiBarang />);
    expect(await screen.findByText('Data tidak ditemukan.')).toBeTruthy();
    expect(screen.getByText('0 Transaksi')).toBeTruthy();
  });

  it('backend error', async () => {
    installFakeApi({ 'GET /api/v1/reports/mutations': fail(403, 'Missing permission: report.view') });
    render(<RekapMutasiBarang />);
    expect(await screen.findByText('Missing permission: report.view')).toBeTruthy();
  });

  it('filters by date range, tipe, lokasi and search; summary ignores filters', async () => {
    installFakeApi({ 'GET /api/v1/reports/mutations': paged(rows) });
    render(<RekapMutasiBarang />);
    await screen.findByText('SPK-in-1');
    setVal('Periode Awal', '2026-04-01');
    expect(bodyRows()).toHaveLength(2);
    setVal('Periode Akhir', '2026-04-10');
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText('SPK-out-2')).toBeTruthy();
    expect(screen.getByText('3 Transaksi')).toBeTruthy();
    setVal('Periode Awal', '');
    setVal('Periode Akhir', '');
    setVal('Tipe Mutasi', 'Masuk');
    expect(bodyRows()).toHaveLength(2);
    setVal('Lokasi', 'A-01');
    setVal('Cari Data', 'item in-3');
    expect(bodyRows()).toHaveLength(1);
    expect((screen.getByLabelText('Cari Data') as HTMLInputElement).maxLength).toBe(100);
  });

  it('date inputs constrain each other (min/max)', async () => {
    installFakeApi({ 'GET /api/v1/reports/mutations': paged(rows) });
    render(<RekapMutasiBarang />);
    await screen.findByText('SPK-in-1');
    setVal('Periode Awal', '2026-04-01');
    setVal('Periode Akhir', '2026-04-30');
    expect((screen.getByLabelText('Periode Akhir') as HTMLInputElement).min).toBe('2026-04-01');
    expect((screen.getByLabelText('Periode Awal') as HTMLInputElement).max).toBe('2026-04-30');
  });

  it('lists locations from the data', async () => {
    installFakeApi({ 'GET /api/v1/reports/mutations': paged(rows) });
    render(<RekapMutasiBarang />);
    await screen.findByText('SPK-in-1');
    const opts = Array.from((screen.getByLabelText('Lokasi') as HTMLSelectElement).options).map((o) => o.value);
    expect(opts).toEqual(['', 'A-01', 'B-02']);
  });

  it('checkbox select-all', async () => {
    installFakeApi({ 'GET /api/v1/reports/mutations': paged(rows) });
    render(<RekapMutasiBarang />);
    await screen.findByText('SPK-in-1');
    fireEvent.click(screen.getByLabelText('Centang semua'));
    expect((screen.getByLabelText('Centang SPK-in-3') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText('Centang SPK-in-3'));
    expect((screen.getByLabelText('Centang semua') as HTMLInputElement).checked).toBe(false);
  });

  it('print window gets escaped rows', async () => {
    installFakeApi({ 'GET /api/v1/reports/mutations': paged([m('in-1', '2026-03-05', 'Masuk', 5, 'A', '<i>x</i>')]) });
    let written = '';
    let printed = false;
    window.open = (() => ({ document: { write: (h: string) => { written = h; }, close: () => {} }, focus: () => {}, print: () => { printed = true; } })) as unknown as typeof window.open;
    render(<RekapMutasiBarang />);
    await screen.findByText('<i>x</i>');
    fireEvent.click(screen.getByText('Print PDF'));
    await waitFor(() => expect(printed).toBe(true));
    expect(written).toContain('&lt;i&gt;x&lt;/i&gt;');
  });

  it.fails('BUG: date filters are applied client-side on the first 100 rows, never sent as startDate/endDate to the API', async () => {
    const api = installFakeApi({ 'GET /api/v1/reports/mutations': paged(rows) });
    render(<RekapMutasiBarang />);
    await screen.findByText('SPK-in-1');
    setVal('Periode Awal', '2026-04-01');
    setVal('Periode Akhir', '2026-04-30');
    await waitFor(() => {
      const last = api.calls('GET /api/v1/reports/mutations').at(-1)!;
      expect(last.query.get('startDate')).toBe('2026-04-01');
      expect(last.query.get('endDate')).toBe('2026-04-30');
    }, { timeout: 500 });
  });
});
