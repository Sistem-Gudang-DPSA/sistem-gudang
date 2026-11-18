import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RekapPembelianPurchasing from '@/domains/purchasing/components/RekapPembelian';
import RekapPembelianPpic from '@/domains/ppic/components/RekapPembelian';

vi.mock('@/domains/ppic/data/pembelian', async (orig) => ({
  ...(await orig<object>()),
  fetchPermintaanList: vi.fn().mockResolvedValue({
    rows: [{ id: 7, tanggal: '2026-01-01', permintaan: 'X', status: 'Belum Disetujui' }],
    total: 1,
  }),
}));

describe('RekapPembelian link per divisi', () => {
  it('purchasing', async () => {
    render(<RekapPembelianPurchasing />);
    expect((await screen.findByText('Lihat Permintaan')).getAttribute('href')).toBe(
      '/dashboard/purchasing/laporan/rekap-pembelian/permintaan-pembelian/7',
    );
  });
  it('ppic', async () => {
    render(<RekapPembelianPpic />);
    expect((await screen.findByText('Lihat Permintaan')).getAttribute('href')).toBe(
      '/dashboard/ppic/laporan/rekap-pembelian/permintaan-pembelian/7',
    );
  });
});
