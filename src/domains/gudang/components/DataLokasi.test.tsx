import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged, fail } from '@/test/fake-api';
import DataLokasi from './DataLokasi';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/gudang/lokasi',
}));

const locs = paged([{ id: 1, code: 'A01', rackName: 'A', rackNumber: '01' }, { id: 2, code: 'B02', rackName: 'B', rackNumber: '02' }]);
const lastQ = (api: ReturnType<typeof installFakeApi>) => api.calls('GET /api/v1/locations').at(-1)!.query;

function setup(extra: Record<string, unknown> = {}, rows: unknown = locs) {
  const api = installFakeApi({ 'GET /api/v1/locations': rows, ...extra });
  render(<DataLokasi />);
  return api;
}
const sel = (opt: string) => screen.getByText(opt, { selector: 'option' }).parentElement as HTMLSelectElement;
async function openForm() {
  await screen.findByText('A01');
  fireEvent.click(screen.getByText('Tambah Data'));
  await screen.findByText('TAMBAH DATA LOKASI');
}

describe('DataLokasi', () => {
  it('shows rows', async () => {
    setup();
    expect(await screen.findByText('A01')).not.toBeNull();
    expect(screen.getByText('B02')).not.toBeNull();
  });

  it('shows empty state', async () => {
    setup({}, paged([]));
    expect(await screen.findByText('Belum ada data lokasi.')).not.toBeNull();
  });

  it('shows API error', async () => {
    setup({ 'GET /api/v1/locations': fail(500, 'Lokasi error') });
    expect(await screen.findByText(/Lokasi error|Gagal memuat/)).not.toBeNull();
  });

  it('sends search in the query (maxLength 100)', async () => {
    const api = setup();
    await screen.findByText('A01');
    expect(lastQ(api).get('search')).toBeNull();
    const input = screen.getByPlaceholderText('Cari...') as HTMLInputElement;
    expect(input.maxLength).toBe(100);
    fireEvent.change(input, { target: { value: 'B0' } });
    await waitFor(() => expect(lastQ(api).get('search')).toBe('B0'));
  });

  it('validates required selects', async () => {
    const api = setup();
    await openForm();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Lengkapi nama rak dan nomer rak.')).not.toBeNull();
    fireEvent.change(sel('Pilih nama rak'), { target: { value: 'A' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Lengkapi nama rak dan nomer rak.')).not.toBeNull();
    expect(api.calls('POST /api/v1/locations').length).toBe(0);
  });

  it('posts code/rackName/rackNumber within backend limits, closes and reloads', async () => {
    const api = setup({ 'POST /api/v1/locations': { id: 3 } });
    await openForm();
    fireEvent.change(sel('Pilih nama rak'), { target: { value: 'C' } });
    fireEvent.change(sel('Pilih nomer rak'), { target: { value: '03' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('POST /api/v1/locations').length).toBe(1));
    const b = api.calls('POST /api/v1/locations')[0].body as { code: string; rackName: string; rackNumber: string };
    expect(b).toEqual({ code: 'C03', rackName: 'C', rackNumber: '03' });
    expect(b.code.length).toBeLessThanOrEqual(20);
    expect(b.rackName.length).toBeLessThanOrEqual(10);
    expect(b.rackNumber.length).toBeLessThanOrEqual(10);
    await waitFor(() => expect(screen.queryByText('TAMBAH DATA LOKASI')).toBeNull());
    await waitFor(() => expect(api.calls('GET /api/v1/locations').length).toBe(2));
  });

  it('shows backend conflict inside the form, keeps it open, button disabled while saving', async () => {
    setup({ 'POST /api/v1/locations': fail(409, 'Kode lokasi sudah ada') });
    await openForm();
    fireEvent.change(sel('Pilih nama rak'), { target: { value: 'A' } });
    fireEvent.change(sel('Pilih nomer rak'), { target: { value: '01' } });
    fireEvent.click(screen.getByText('Simpan'));
    expect((screen.getByText('Menyimpan...') as HTMLButtonElement).disabled).toBe(true);
    expect(await screen.findByText('Kode lokasi sudah ada')).not.toBeNull();
    expect(screen.getByText('TAMBAH DATA LOKASI')).not.toBeNull();
    expect((screen.getByText('Simpan') as HTMLButtonElement).disabled).toBe(false);
  });

  it('clears the form error when the modal is closed', async () => {
    setup();
    await openForm();
    fireEvent.click(screen.getByText('Simpan'));
    expect(screen.getByText('Lengkapi nama rak dan nomer rak.')).not.toBeNull();
    fireEvent.click(screen.getByText('TAMBAH DATA LOKASI').parentElement!.querySelector('button')!);
    expect(screen.queryByText('TAMBAH DATA LOKASI')).toBeNull();
    expect(screen.queryByText('Lengkapi nama rak dan nomer rak.')).toBeNull();
  });
});
