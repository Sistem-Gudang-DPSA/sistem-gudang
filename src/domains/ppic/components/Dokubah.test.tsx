import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import Dokubah from './Dokubah';

const row = (id: number, status: string, over: Record<string, unknown> = {}) => ({
  id, noSpk: `SPK-${id}`, client: `Client ${id}`, tanggalMulai: `2026-0${id}-10`, tanggalSelesai: `2026-0${id}-20`,
  status, fileDokubah: null, totalAnggaran: 1000, createdBy: 1, createdAt: '', updatedAt: '',
  totalKuota: 0, totalRealisasi: 0, totalRealisasiNilai: 0, ...over,
});

const rows = [row(1, 'DRAFT'), row(2, 'PENDING'), row(3, 'APPROVED'), row(4, 'REJECTED')];

describe('Dokubah list', () => {
  it('loads rows with formatted dates and status badges', async () => {
    const api = installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(<Dokubah />);
    expect(await screen.findByText('SPK-1')).toBeTruthy();
    expect(screen.getByText('Client 3')).toBeTruthy();
    expect(screen.getByText('10/01/2026')).toBeTruthy();
    for (const s of ['Draft', 'Pending', 'Approved', 'Rejected']) {
      // badge text, not the filter option (filter panel closed)
      expect(screen.getAllByText(s).length).toBe(1);
    }
    expect(api.calls('GET /api/v1/dokubah')[0].query.get('pageSize')).toBe('100');
  });

  it('offers only a View link per status (no edit/approve actions in the list)', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(<Dokubah />);
    await screen.findByText('SPK-1');
    const links = screen.getAllByText('View').map((el) => el.closest('a')?.getAttribute('href'));
    expect(links).toEqual([1, 2, 3, 4].map((i) => `/dashboard/ppic/transaksi/dokubah/view-dokubah/${i}`));
    expect(screen.queryByText('Edit')).toBeNull();
  });

  it('links to the create screen', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged([]) });
    render(<Dokubah />);
    expect(screen.getByText('Buat Dokubah').closest('a')?.getAttribute('href')).toBe('/dashboard/ppic/transaksi/dokubah/buat-dokubah');
    await screen.findByText('Data tidak ditemukan.');
  });

  it('shows the empty state', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged([]) });
    render(<Dokubah />);
    expect(await screen.findByText('Data tidak ditemukan.')).toBeTruthy();
  });

  it('shows the backend error', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': fail(403, 'Missing permission: dokubah.view') });
    render(<Dokubah />);
    expect(await screen.findByText('Missing permission: dokubah.view')).toBeTruthy();
  });

  it('search box is limited to 100 chars and filters by SPK or client', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(<Dokubah />);
    await screen.findByText('SPK-1');
    const box = screen.getByPlaceholderText(/Cari No. SPK/) as HTMLInputElement;
    expect(box.maxLength).toBe(100);
    fireEvent.change(box, { target: { value: 'client 2' } });
    expect(screen.queryByText('SPK-1')).toBeNull();
    expect(screen.getByText('SPK-2')).toBeTruthy();
    fireEvent.change(box, { target: { value: 'zzz' } });
    expect(screen.getByText('Data tidak ditemukan.')).toBeTruthy();
  });

  it('filters by status and start date range, and resets', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(<Dokubah />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByText('Filter'));
    fireEvent.change(screen.getByDisplayValue('Semua Status'), { target: { value: 'Approved' } });
    expect(screen.queryByText('SPK-1')).toBeNull();
    expect(screen.getByText('SPK-3')).toBeTruthy();
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByText('SPK-1')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Tanggal mulai dari'), { target: { value: '2026-03-01' } });
    fireEvent.change(screen.getByLabelText('Tanggal mulai sampai'), { target: { value: '2026-03-31' } });
    expect(screen.queryByText('SPK-2')).toBeNull();
    expect(screen.getByText('SPK-3')).toBeTruthy();
    expect(screen.queryByText('SPK-4')).toBeNull();
  });

  it('select-all and per-row checkboxes', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(<Dokubah />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByLabelText('Centang SPK-2'));
    expect(screen.getByText(/1 data dicentang/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Centang semua'));
    expect(screen.getByText(/4 data dicentang/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Centang semua'));
    expect(screen.queryByText(/data dicentang/)).toBeNull();
  });
});

describe('Dokubah print', () => {
  it('writes escaped rows to the print window', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged([row(1, 'DRAFT', { client: '<b>X</b>' })]) });
    const doc = { write: (html: string) => { written = html; }, close: () => {} };
    let written = '';
    const win = { document: doc, focus: () => {}, print: () => { printed = true; } };
    let printed = false;
    window.open = (() => win) as unknown as typeof window.open;
    render(<Dokubah />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByText('Print PDF'));
    await waitFor(() => expect(printed).toBe(true));
    expect(written).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(written).not.toContain('<b>X</b>');
  });
});
