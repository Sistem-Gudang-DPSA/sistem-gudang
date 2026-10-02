import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import RekapStokOpname from './RekapStokOpname';

const m = (id: string, tanggal: string, tipe: 'Masuk' | 'Keluar', qty: number) => ({
  id, tanggal, noReferensiSpk: `SPK-${id}`, kodeBarang: `KB-${id}`, namaItem: `Item ${id}`, tipe, qty, lokasi: 'A',
});
const rows = [m('in-1', '2026-03-05', 'Masuk', 1000), m('out-2', '2026-04-10', 'Keluar', 250)];
const summary = { totalAudit: 3, totalItemSelisih: 12, totalAdjustmentNilai: -1500000 };
const bodyRows = () => screen.getAllByRole('row').slice(1);

const routes = (s: unknown = summary) => ({ 'GET /api/v1/reports/mutations': paged(rows), 'GET /api/v1/reports/stock-opname-summary': s });

describe('RekapStokOpname', () => {
  it('loads summary (no period params at first) and mutation rows', async () => {
    const api = installFakeApi(routes());
    render(<RekapStokOpname />);
    expect(await screen.findByText('SPK-in-1')).toBeTruthy();
    expect(await screen.findByText('3 kali selesai')).toBeTruthy();
    expect(screen.getByText('12 item')).toBeTruthy();
    expect(screen.getByText('− 1.500.000 (Kerugian)')).toBeTruthy();
    const q = api.calls('GET /api/v1/reports/stock-opname-summary')[0].query;
    expect(q.get('month')).toBeNull();
    expect(q.get('year')).toBeNull();
    expect(screen.getByText('+ 1.000')).toBeTruthy();
    expect(screen.getByText('− 250')).toBeTruthy();
  });

  it('positive adjustment is Keuntungan', async () => {
    installFakeApi(routes({ ...summary, totalAdjustmentNilai: 2000 }));
    render(<RekapStokOpname />);
    expect(await screen.findByText('+ 2.000 (Keuntungan)')).toBeTruthy();
  });

  it('selecting a periode sends month and year to the summary and filters rows', async () => {
    const api = installFakeApi(routes());
    render(<RekapStokOpname />);
    await screen.findByText('SPK-in-1');
    fireEvent.change(screen.getByLabelText('Periode'), { target: { value: '2026-04' } });
    await waitFor(() => {
      const last = api.calls('GET /api/v1/reports/stock-opname-summary').at(-1)!;
      expect(last.query.get('month')).toBe('4');
      expect(last.query.get('year')).toBe('2026');
    });
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText('SPK-out-2')).toBeTruthy();
    expect(screen.getByText('April 2026')).toBeTruthy();
  });

  it('empty state with zero summary', async () => {
    installFakeApi({ 'GET /api/v1/reports/mutations': paged([]), 'GET /api/v1/reports/stock-opname-summary': { totalAudit: 0, totalItemSelisih: 0, totalAdjustmentNilai: 0 } });
    render(<RekapStokOpname />);
    expect(await screen.findByText('Data tidak ditemukan.')).toBeTruthy();
    expect(screen.getByText('0 kali selesai')).toBeTruthy();
  });

  it('backend error on the mutation list', async () => {
    installFakeApi({ 'GET /api/v1/reports/mutations': fail(403, 'Missing permission: report.view'), 'GET /api/v1/reports/stock-opname-summary': summary });
    render(<RekapStokOpname />);
    expect(await screen.findByText('Missing permission: report.view')).toBeTruthy();
  });

  it('checkbox select-all', async () => {
    installFakeApi(routes());
    render(<RekapStokOpname />);
    await screen.findByText('SPK-in-1');
    fireEvent.click(screen.getByLabelText('Centang semua'));
    expect((screen.getByLabelText('Centang SPK-out-2') as HTMLInputElement).checked).toBe(true);
  });

  it.fails('BUG: a failed summary request is swallowed and shows 0 kali selesai instead of the backend error', async () => {
    installFakeApi({ 'GET /api/v1/reports/mutations': paged(rows), 'GET /api/v1/reports/stock-opname-summary': fail(500, 'Summary gagal') });
    render(<RekapStokOpname />);
    await screen.findByText('SPK-in-1');
    expect(await screen.findByText('Summary gagal', {}, { timeout: 500 })).toBeTruthy();
  });

  it.fails('BUG: periode filter on the mutation table is client-side only; month is never sent to /reports/mutations', async () => {
    const api = installFakeApi(routes());
    render(<RekapStokOpname />);
    await screen.findByText('SPK-in-1');
    fireEvent.change(screen.getByLabelText('Periode'), { target: { value: '2026-04' } });
    await waitFor(() => {
      const last = api.calls('GET /api/v1/reports/mutations').at(-1)!;
      expect(last.query.get('startDate')).toBe('2026-04-01');
    }, { timeout: 500 });
  });
});
