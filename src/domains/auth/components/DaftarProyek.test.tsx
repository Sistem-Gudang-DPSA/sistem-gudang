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
    fireEvent.change(screen.getByPlaceholderText('Cari client, proyek, atau SPK...'), { target: { value: 'Klien' } });
    await waitFor(() => expect(api.calls('GET /api/v1/tracking/spk').some((c) => c.query.get('search') === 'Klien')).toBe(true));
    expect(screen.getByRole('button', { name: '1' }).getAttribute('aria-current')).toBe('page');
  });
});
