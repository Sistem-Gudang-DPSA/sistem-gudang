import { describe, expect, it } from 'vitest';
import { buat_dokubah_path, detailRekapDokubahPath, dokubah_path, editMaterialPath, formatAngka, formatRupiah, formatTanggal, viewDokubahPath } from './dokubah';
import { alokasiBarangPath, buat_spk_internal_path, spk_internal_path } from './spk-internal';

describe('dokubah formatters', () => {
  it('formatTanggal swaps to DD/MM/YYYY without Date', () => expect(formatTanggal('2026-01-31')).toBe('31/01/2026'));
  it('formatAngka uses id-ID separators', () => {
    expect(formatAngka(1234567)).toBe('1.234.567');
    expect(formatAngka(0)).toBe('0');
    expect(formatAngka(1.5)).toBe('1,5');
  });
  it('formatRupiah', () => {
    expect(formatRupiah(1500000)).toBe('Rp. 1.500.000');
    expect(formatRupiah(0)).toBe('Rp. 0');
    expect(formatRupiah(-2500)).toBe('-Rp. 2.500');
  });
  it('paths', () => {
    expect(buat_dokubah_path).toBe(`${dokubah_path}/buat-dokubah`);
    expect(viewDokubahPath(4)).toBe(`${dokubah_path}/view-dokubah/4`);
    expect(editMaterialPath('5')).toBe(`${dokubah_path}/edit-material/5`);
    expect(detailRekapDokubahPath(6)).toBe('/dashboard/ppic/laporan/rekap-dokubah/detail-rekap-dokubah/6');
  });
  it('spk-internal paths', () => {
    expect(buat_spk_internal_path).toBe(`${spk_internal_path}/buat-spk`);
    expect(alokasiBarangPath(8)).toBe(`${spk_internal_path}/alokasi-barang/8`);
  });
});
