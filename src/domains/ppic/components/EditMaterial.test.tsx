import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi, paged } from '@/test/fake-api';
import EditMaterialPPIC from './EditMaterial';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: '7' }),
  useSearchParams: () => new URLSearchParams(),
}));

const base = {
  id: 7, noSpk: 'SPK-007', client: 'PT Maju', tanggalMulai: '2026-05-01', tanggalSelesai: '2026-05-31',
  status: 'APPROVED', fileDokubah: null, totalAnggaran: 100000, createdBy: 1, createdAt: '', updatedAt: '',
  totalKuota: 0, totalRealisasi: 0, totalRealisasiNilai: 0,
  bahan: [
    { kodeBarang: 'A-1', namaBahan: 'Triplex', satuan: 'lembar', hargaSatuan: 1000, kuota: 20, realisasi: 0, keterangan: '' },
  ],
};

describe('EditMaterial kuota validation', () => {
  it('marks an empty allotment red only after Simpan is pressed', async () => {
    installFakeApi({ 'GET /api/v1/dokubah/7': base, 'GET /api/v1/dokubah': paged([base]) });
    render(<EditMaterialPPIC />);
    const kuota = await screen.findByLabelText('Kuota alokasi baris 1') as HTMLInputElement;
    fireEvent.change(kuota, { target: { value: '' } });
    expect(kuota.className).not.toContain('bg-red-50');
    expect(kuota.getAttribute('aria-invalid')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Perubahan' }));
    await waitFor(() => expect(kuota.className).toContain('bg-red-50'));
    expect(kuota.getAttribute('aria-invalid')).toBe('true');

    fireEvent.change(kuota, { target: { value: '5' } });
    expect(kuota.className).not.toContain('bg-red-50');
  });
});
