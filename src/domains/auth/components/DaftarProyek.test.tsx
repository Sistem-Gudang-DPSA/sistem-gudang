import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { installFakeApi } from '@/test/fake-api';
import DaftarProyekPage from './DaftarProyek';

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard/daftar-proyek' }));

const spk = (n: number) => ({ noSpk: `SPK-${n}`, client: `Klien ${n}`, projectName: `Proyek ${n}` });
const many = Array.from({ length: 120 }, (_, i) => spk(i + 1));

const rowCount = () => screen.getAllByRole('row').length - 1; // minus header row
const footer = () => screen.getByText(/Menampilkan/).textContent;

describe('DaftarProyek', () => {
  it('shows the SPK masuk date from tracking, and "-" when it is missing', async () => {
    installFakeApi({
      'GET /api/v1/tracking/spk': [
        { ...spk(1), tanggalMasuk: '2026-01-05' },
        { ...spk(2), tanggalMasuk: null },
      ],
    });
    render(<DaftarProyekPage />);
    await screen.findByText('SPK-1');
    const cells = (no: string) => screen.getByText(no).closest('tr')!.querySelectorAll('td');
    expect(cells('SPK-1')[4].textContent).toBe(new Date('2026-01-05T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'medium' }));
    expect(cells('SPK-2')[4].textContent).toBe('-');
  });

  it('requests the full list without a limit', async () => {
    const api = installFakeApi({ 'GET /api/v1/tracking/spk': many });
    render(<DaftarProyekPage />);
    await screen.findByText('SPK-1');
    expect(api.calls('GET /api/v1/tracking/spk')[0].query.has('limit')).toBe(false);
  });

  it('shows 20 rows per page by default and pages through all rows', async () => {
    installFakeApi({ 'GET /api/v1/tracking/spk': many });
    render(<DaftarProyekPage />);
    await screen.findByText('SPK-1');
    expect(rowCount()).toBe(20);
    expect(footer()).toContain('dari 120 data');
    fireEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    expect(screen.getByText('SPK-21')).toBeTruthy();
  });

  it('changes page size to 50 and 100, and resets to page 1', async () => {
    installFakeApi({ 'GET /api/v1/tracking/spk': many });
    render(<DaftarProyekPage />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-current')).toBe('page');

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '50' } });
    expect(rowCount()).toBe(50);
    expect(footer()).toContain('dari 120 data');
    expect(screen.getByRole('button', { name: '1' }).getAttribute('aria-current')).toBe('page');

    fireEvent.change(select, { target: { value: '100' } });
    expect(rowCount()).toBe(100);
  });

  it('resets to page 1 when the search changes', async () => {
    const api = installFakeApi({ 'GET /api/v1/tracking/spk': many });
    render(<DaftarProyekPage />);
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByRole('button', { name: 'Selanjutnya' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari di semua kolom Daftar Proyek' }), { target: { value: 'Klien' } });
    await waitFor(() => expect(screen.getByRole('button', { name: '1' }).getAttribute('aria-current')).toBe('page'));
    expect(api.calls('GET /api/v1/tracking/spk')).toHaveLength(1);
    expect(api.calls('GET /api/v1/tracking/spk')[0].query.has('search')).toBe(false);
  });

  it.each([
    ['client', '  kLiEn 120  '],
    ['nama proyek', 'Proyek 120'],
    ['nomor SPK', 'SPK-120'],
    ['SPK masuk', new Date('2026-01-05T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'medium' })],
  ])('mencari kolom %s pada seluruh data, termasuk halaman lain', async (_, query) => {
    const rows = many.map((item, index) => ({ ...item, tanggalMasuk: index === 119 ? '2026-01-05' : null }));
    // Simulate a backend search that does not cover every column.
    const api = installFakeApi({
      'GET /api/v1/tracking/spk': (r: { query: URLSearchParams }) => r.query.has('search') ? [] : rows,
    });
    render(<DaftarProyekPage />);
    await screen.findByText('SPK-1');
    expect(screen.queryByText('SPK-120')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari di semua kolom Daftar Proyek' }), { target: { value: query } });
    expect(await screen.findByText('SPK-120')).not.toBeNull();
    expect(rowCount()).toBe(1);
    expect(api.calls('GET /api/v1/tracking/spk')).toHaveLength(1);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    await waitFor(() => expect(rowCount()).toBe(20));
    expect(footer()).toContain('dari 120 data');
  });

  it('menampilkan hasil kosong dan tetap mencari di semua kolom setelah refresh', async () => {
    const rows = [{ ...spk(1), tanggalMasuk: '2026-01-05' }];
    const api = installFakeApi({ 'GET /api/v1/tracking/spk': rows });
    render(<DaftarProyekPage />);
    await screen.findByText('SPK-1');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'tidak ada' } });
    expect(await screen.findByText('Data proyek tidak ditemukan.')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh data tracking' }));
    await screen.findByText('Data tracking berhasil diperbarui.');
    await waitFor(() => expect(api.calls('GET /api/v1/tracking/spk')).toHaveLength(3));
    expect(api.calls('GET /api/v1/tracking/spk').some((c) => c.query.get('refresh') === '1')).toBe(true);
    expect(api.calls('GET /api/v1/tracking/spk').every((c) => !c.query.has('search') && !c.query.has('limit'))).toBe(true);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '2026' } });
    expect(await screen.findByText('SPK-1')).not.toBeNull();
  });
});
