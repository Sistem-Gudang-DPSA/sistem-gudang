import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import BatchLokasiModal from './BatchLokasiModal';

const location = (code: string) => ({ id: 1, code, rackName: code[0], rackNumber: '1.1', description: null });

const setup = (existing: { code: string }[] = [], bulk: unknown = { created: 0, skipped: [] }) => {
  const api = installFakeApi({
    'GET /api/v1/locations': paged(existing),
    'POST /api/v1/locations/bulk': bulk,
  });
  render(<BatchLokasiModal onClose={vi.fn()} onSaved={vi.fn()} />);
  return api;
};
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('BatchLokasiModal', () => {
  it('clamps huge numbers to 99 and does not build a million rows', () => {
    setup();
    type('Rak', 'A');
    type('Kolom sampai', '999999');
    type('Baris sampai', '999999');
    expect((screen.getByLabelText('Kolom sampai') as HTMLInputElement).value).toBe('999999');
    expect(screen.getByText('Preview (0 lokasi)')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/Terlalu banyak lokasi/);
    expect((screen.getByRole('button', { name: /Simpan/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('lets a field be cleared while typing and disables Simpan until it has a number', () => {
    setup();
    type('Rak', 'A');
    expect(screen.getByText('Preview (1 lokasi)')).toBeTruthy();
    type('Kolom sampai', '');
    expect((screen.getByLabelText('Kolom sampai') as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Preview (0 lokasi)')).toBeTruthy();
    expect((screen.getByRole('button', { name: /Simpan/ }) as HTMLButtonElement).disabled).toBe(true);
    type('Kolom sampai', '3');
    expect(screen.getByText('Preview (3 lokasi)')).toBeTruthy();
  });

  it('names the ignored rak parts', () => {
    setup();
    type('Rak', 'A-C,F1');
    expect(screen.getByRole('status').textContent).toContain('F1 diabaikan');
    expect(screen.getByText('Preview (3 lokasi)')).toBeTruthy();
  });

  it('warns about existing codes before submit and only saves the new ones', async () => {
    const api = setup([location('A.1.1')], { created: 1, skipped: [] });
    type('Rak', 'A');
    type('Baris sampai', '2');
    expect(await screen.findByText(/1 kode sudah ada dan tidak akan ditambahkan: A\.1\.1/)).toBeTruthy();
    expect(screen.getByText('Preview (2 lokasi, 1 baru)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Simpan 1 lokasi' }));
    await waitFor(() => expect(api.calls('POST /api/v1/locations/bulk')).toHaveLength(1));
    expect((api.calls('POST /api/v1/locations/bulk')[0].body as { rows: { code: string }[] }).rows.map((row) => row.code)).toEqual(['A.1.2']);
  });

  it('disables Simpan when every generated code already exists', async () => {
    setup([location('A.1.1'), location('A.1.2')]);
    type('Rak', 'A');
    type('Baris sampai', '2');
    expect(await screen.findByText(/2 kode sudah ada/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Simpan 0 lokasi' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('still allows saving when the existing codes cannot be checked', async () => {
    installFakeApi({});
    render(<BatchLokasiModal onClose={vi.fn()} onSaved={vi.fn()} />);
    type('Rak', 'A');
    expect(await screen.findByText(/belum bisa diperiksa/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Simpan 1 lokasi' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
