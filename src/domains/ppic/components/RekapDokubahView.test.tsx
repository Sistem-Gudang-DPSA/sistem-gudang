import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import RekapDokubahView from './RekapDokubahView';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/dashboard/ppic/dokubah',
}));

const row = (id: number) => ({
  id,
  noSpk: `SPK-${id}`,
  client: `Klien ${id}`,
  tanggalMulai: '2026-01-01',
  tanggalSelesai: '2026-01-02',
  status: 'APPROVED',
  fileDokubah: null,
  totalAnggaran: 1000,
  createdBy: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  totalKuota: 1,
  totalRealisasi: 1,
  totalRealisasiNilai: 500,
});

function setup() {
  const api = installFakeApi({ 'GET /api/v1/dokubah': paged([row(1), row(2)]) });
  render(<RekapDokubahView detailPath={(id) => `/dokubah/${id}`} />);
  return api;
}

describe('RekapDokubahView selection', () => {
  it('keeps checked rows when the search changes', async () => {
    const api = setup();
    await screen.findByText('SPK-1');
    fireEvent.click(screen.getByLabelText('Centang SPK-1'));
    expect(screen.getByRole('status').textContent).toContain('1 baris dipilih');

    fireEvent.change(screen.getByLabelText('Cari Data'), { target: { value: 'SPK-2' } });
    await waitFor(() => expect(api.calls('GET /api/v1/dokubah').at(-1)!.query.get('search')).toBe('SPK-2'));

    expect((screen.getByLabelText('Centang SPK-1') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByLabelText('Centang SPK-2'));
    expect(screen.getByRole('status').textContent).toContain('2 baris dipilih');

    fireEvent.click(screen.getByRole('button', { name: 'Bersihkan pilihan' }));
    expect((screen.getByLabelText('Centang SPK-1') as HTMLInputElement).checked).toBe(false);
  });
});
