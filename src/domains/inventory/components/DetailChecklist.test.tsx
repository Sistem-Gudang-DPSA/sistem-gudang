import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { installFakeApi } from '@/test/fake-api';
import DetailChecklist from './DetailChecklist';

const back = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back }),
  useParams: () => ({ id: '4' }),
}));
afterEach(() => vi.unstubAllGlobals());

const detail = {
  dokubah: { id: 4, kodeDokubah: 'DKB-4', namaClient: 'PT Maju', namaItem: 'Lemari', noSpk: 'SPK-9' },
  checklist: {
    kepalaGroup: 'Budi', tglMulai: '2026-03-01', tglSelesai: null, kolomRealisasi: 2, updatedAt: '2026-03-02T00:00:00Z',
    lines: [{ material: 'Triplex', dokubah: '10', selisih: null, realisasi: [{ tanggal: '2026-03-02', pengambil: 'Andi', jumlah: 4 }, { tanggal: null, pengambil: '', jumlah: 0 }], keterangan: null }],
  },
};

describe('DetailChecklist', () => {
  it('prefills from API and PUTs the mapped body', async () => {
    const api = installFakeApi({ 'GET /api/v1/checklist-dokubah/4': detail, 'PUT /api/v1/checklist-dokubah/4': detail });
    render(<DetailChecklist />);
    expect(((await screen.findByLabelText('No. SPK')) as HTMLInputElement).value).toBe('SPK-9');
    expect((screen.getByLabelText('Kepala Group Tukang') as HTMLInputElement).value).toBe('Budi');
    fireEvent.change(screen.getByLabelText('Kepala Group Tukang'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Simpan'));
    await waitFor(() => expect(api.calls('PUT /api/v1/checklist-dokubah/4')).toHaveLength(1));
    const body = api.calls('PUT /api/v1/checklist-dokubah/4')[0].body as { kolomRealisasi: number; lines: { realisasi: unknown[] }[] };
    expect(body).toMatchObject({ kepalaGroup: null, tglMulai: '2026-03-01', tglSelesai: null, kolomRealisasi: 3 });
    expect(body.lines).toHaveLength(5);
    expect(body.lines[0]).toEqual({
      material: 'Triplex', dokubah: '10', selisih: null, keterangan: null,
      realisasi: [{ tanggal: '2026-03-02', pengambil: 'Andi', jumlah: 4 }, { tanggal: null, pengambil: '', jumlah: 0 }, { tanggal: null, pengambil: '', jumlah: 0 }],
    });
    await waitFor(() => expect(back).toHaveBeenCalled());
  });
});
