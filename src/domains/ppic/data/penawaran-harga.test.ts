import { describe, expect, it } from 'vitest';
import type { PenawaranDetail } from '@/domains/ppic/types';
import { KATEGORI_BAHAN, STATUS_UI, barisBahanKosong, detailKeForm, estimasiPenawaranPath, formKePayload, type EstimasiPenawaran } from './penawaran-harga';

const detail = (over: Partial<PenawaranDetail> = {}) =>
  ({
    id: 1, namaClient: 'C', namaProyek: 'P', tanggal: '2026-04-01T00:00:00Z',
    pekerjaan: 'Kerja', ruangan: 'R', ukuran: 'U', jumlah: '3',
    tglMulaiProduksi: null, tglSelesaiProduksi: '2026-05-01T00:00:00Z',
    kategori: [{ kategori: 'Finishing', subtotal: 0, bahan: [{ namaBahan: 'Cat', satuan: null, panjang: 0, lebar: 1.5, tinggi: 0, jumlahSatuan: 2, jumlahOrder: 0, hargaSatuan: 10000, keterangan: null }] }],
    ...over,
  }) as unknown as PenawaranDetail;

const emptyForm = (): EstimasiPenawaran => ({
  namaClient: ' C ', namaProyek: ' P ', tanggal: '', pekerjaan: '', ruangan: '', ukuran: '', jumlah: '', tglMulaiProduksi: '', tglSelesaiProduksi: '',
  bahan: KATEGORI_BAHAN.map(() => [barisBahanKosong(), barisBahanKosong()]),
});

describe('penawaran-harga', () => {
  it('STATUS_UI and path', () => {
    expect(STATUS_UI).toEqual({ DRAFT: 'Draft', PUBLISH: 'Publish' });
    expect(estimasiPenawaranPath(3)).toBe('/dashboard/ppic/master/penawaran-harga/estimasi-penawaran-biaya/3');
  });

  describe('detailKeForm', () => {
    const f = detailKeForm(detail());
    it('trims dates and nulls to empty', () => {
      expect(f.tanggal).toBe('2026-04-01');
      expect(f.tglMulaiProduksi).toBe('');
      expect(f.tglSelesaiProduksi).toBe('2026-05-01');
    });
    it('has one list per category, padded to two rows', () => {
      expect(f.bahan).toHaveLength(KATEGORI_BAHAN.length);
      f.bahan.forEach((rows) => expect(rows.length).toBeGreaterThanOrEqual(2));
      expect(f.bahan[0]).toEqual([barisBahanKosong(), barisBahanKosong()]);
    });
    it('puts rows in the right category, 0 shown empty, null text empty', () => {
      const i = KATEGORI_BAHAN.indexOf('Finishing');
      expect(f.bahan[i][0]).toEqual({ namaBahan: 'Cat', satuan: '', panjang: '', lebar: '1.5', tinggi: '', jumlahSatuan: '2', jumlahOrder: '', hargaSatuan: '10000', keterangan: '' });
      expect(f.bahan[i]).toHaveLength(2);
    });
    it('keeps more than two rows', () => {
      const row = { namaBahan: 'x', panjang: 0, lebar: 0, tinggi: 0, jumlahSatuan: 0, jumlahOrder: 0, hargaSatuan: 0 };
      const g = detailKeForm(detail({ kategori: [{ kategori: 'Packing', subtotal: 0, bahan: [row, row, row] as never }] }));
      expect(g.bahan[KATEGORI_BAHAN.indexOf('Packing')]).toHaveLength(3);
    });
  });

  describe('formKePayload', () => {
    it('drops all-empty rows, empty dates become null, tanggal omitted, names trimmed', () => {
      const p = formKePayload(emptyForm());
      expect(p.bahan).toEqual([]);
      expect(p.tglMulaiProduksi).toBeNull();
      expect(p.tglSelesaiProduksi).toBeNull();
      expect('tanggal' in p).toBe(false);
      expect(p.namaClient).toBe('C');
      expect(p.namaProyek).toBe('P');
    });
    it('converts numbers, truncates price, uses enum names by index', () => {
      const form = emptyForm();
      form.tanggal = '2026-01-01';
      form.bahan[3][1] = { ...barisBahanKosong(), namaBahan: ' Cat ', panjang: '1.5', jumlahOrder: '4', hargaSatuan: '1234.9', lebar: 'abc' };
      form.bahan[5][0] = { ...barisBahanKosong(), keterangan: 'only note' };
      const p = formKePayload(form);
      expect(p.tanggal).toBe('2026-01-01');
      expect(p.bahan).toHaveLength(2);
      expect(p.bahan[0]).toMatchObject({ kategori: 'Finishing', namaBahan: 'Cat', panjang: 1.5, lebar: 0, jumlahOrder: 4, hargaSatuan: 1234 });
      expect(p.bahan[1]).toMatchObject({ kategori: 'Tenaga', namaBahan: '', keterangan: 'only note' });
    });
    it('whitespace-only row counts as empty', () => {
      const form = emptyForm();
      form.bahan[0][0].namaBahan = '   ';
      expect(formKePayload(form).bahan).toEqual([]);
    });
    it('roundtrips detail -> form -> payload', () => {
      const p = formKePayload(detailKeForm(detail()));
      expect(p.bahan).toEqual([expect.objectContaining({ kategori: 'Finishing', namaBahan: 'Cat', hargaSatuan: 10000, lebar: 1.5, panjang: 0 })]);
    });
  });
});
