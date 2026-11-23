import { describe, expect, it, vi } from 'vitest';
import { cetakFormPermintaanPembelian } from './print-permintaan-pembelian';
import { cetakLaporan } from '@/shared/lib/print-laporan';

vi.mock('@/shared/lib/print-laporan', () => ({ cetakLaporan: vi.fn(async () => {}) }));

describe('tanda tangan cetak permintaan pembelian', () => {
  it.each([
    ['Gudang', 'PPIC'],
    ['Gudang Bahan Baku', 'PPIC'],
    ['Gudang Barang Jadi', 'PPIC'],
    [' gudang ', 'PPIC'],
    ['Produksi', 'Bag. Purchasing'],
    ['PPIC', 'Bag. Purchasing'],
  ])('mencetak penandatangan permintaan %s sebagai Kepala Gudang dan %s', async (bagian, penyetuju) => {
    await cetakFormPermintaanPembelian({ bagian, namaPemohon: 'imel', jabatan: 'Staff', tanggalPengajuan: '2026-11-23', periode: '' }, []);
    const html = vi.mocked(cetakLaporan).mock.calls.at(-1)![1];
    const document = new DOMParser().parseFromString(html, 'text/html');
    const signatures = [...document.querySelectorAll('table:last-of-type td')].map((cell) => cell.textContent);
    expect(signatures).toEqual(['DibuatKepala Gudang', `Disetujui Oleh${penyetuju}`]);
  });
});
