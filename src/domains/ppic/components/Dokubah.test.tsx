import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import { vi as viTimeout } from 'vitest';
viTimeout.setConfig({ testTimeout: 30000 });
import Dokubah from './Dokubah';
import { withUser } from './as-user';

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
    expect(api.calls('GET /api/v1/dokubah')[0].query.get('pageSize')).toBe('20');
    expect(api.calls('GET /api/v1/dokubah')[0].query.get('page')).toBe('1');
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

  const lastQuery = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/dokubah').at(-1)!.query;

  it('search box is limited to 100 chars and is sent as the search param', async () => {
    const api = installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(<Dokubah />);
    await screen.findByText('SPK-1');
    const box = screen.getByPlaceholderText(/Cari No. SPK/) as HTMLInputElement;
    expect(box.maxLength).toBe(100);
    fireEvent.change(box, { target: { value: 'client 2' } });
    await waitFor(() => expect(lastQuery(api).get('search')).toBe('client 2'));
  });

  it('sends status and date filters to the API, and reset clears them', async () => {
    const api = installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(<Dokubah />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByText('Filter'));
    fireEvent.change(screen.getByDisplayValue('Semua Status'), { target: { value: 'Approved' } });
    fireEvent.change(screen.getByLabelText('Tanggal mulai dari'), { target: { value: '2026-03-01' } });
    fireEvent.change(screen.getByLabelText('Tanggal mulai sampai'), { target: { value: '2026-03-31' } });
    await waitFor(() => expect(lastQuery(api).get('endDate')).toBe('2026-03-31'));
    expect(lastQuery(api).get('status')).toBe('APPROVED');
    expect(lastQuery(api).get('startDate')).toBe('2026-03-01');
    fireEvent.click(screen.getByText('Reset'));
    await waitFor(() => expect(lastQuery(api).get('status')).toBeNull());
    expect(lastQuery(api).get('startDate')).toBeNull();
  });

  it('paginates on the server and goes back to page 1 when a filter changes', async () => {
    const api = installFakeApi({ 'GET /api/v1/dokubah': (req: { query: URLSearchParams }) => paged(rows, { total: 45, page: Number(req.query.get('page')) }) });
    render(<Dokubah />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    await waitFor(() => expect(lastQuery(api).get('page')).toBe('3'));
    fireEvent.change(screen.getByPlaceholderText(/Cari No. SPK/), { target: { value: 'x' } });
    await waitFor(() => expect(lastQuery(api).get('search')).toBe('x'));
    expect(lastQuery(api).get('page')).toBe('1');
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


describe('permissions', () => {
  it('a view-only user keeps the screen but not the actions', async () => {
    installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(withUser(<Dokubah />, ['dokubah.view']));
    await screen.findByText('SPK-1');
    expect(screen.queryByText('Buat Dokubah')).toBeNull();
  });

  it.each([
    ['holds the permission', ['dokubah.create'], false],
    ['is a superadmin', [], true],
  ])('a user who %s sees the actions', async (_label, perms, isSuperadmin) => {
    installFakeApi({ 'GET /api/v1/dokubah': paged(rows) });
    render(withUser(<Dokubah />, perms, isSuperadmin));
    await screen.findByText('SPK-1');
    expect(screen.getByText('Buat Dokubah')).toBeTruthy();
  });
});
