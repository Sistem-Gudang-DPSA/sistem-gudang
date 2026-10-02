import { describe, expect, it } from 'vitest';
import { PEMESAN, buatPoPath, lihatPermintaanPath, rekap_pembelian_path } from './pembelian';

describe('purchasing pembelian paths', () => {
  it('builds paths', () => {
    expect(lihatPermintaanPath(3)).toBe(`${rekap_pembelian_path}/permintaan-pembelian/3`);
    expect(buatPoPath('9')).toBe('/dashboard/purchasing/laporan/rekap-pembelian/buat-po/9');
    expect(PEMESAN.nama).toBeTruthy();
  });
});
