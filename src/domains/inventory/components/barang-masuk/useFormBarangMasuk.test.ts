import { describe, expect, it } from 'vitest';
import { peringatanJumlahMasuk } from './useFormBarangMasuk';

describe('validasi jumlah Barang Masuk', () => {
  it.each(['kedatangan', 'rekap'] as const)('shows a short warning for incomplete %s decimals', (field) => {
    expect(peringatanJumlahMasuk('1.', field)).toBe('Lengkapi angka desimal.');
    expect(peringatanJumlahMasuk('0.', field)).toBe('Lengkapi angka desimal.');
  });

  it.each(['0.001', '.5', '1.125', '100000'])('accepts arrival %s', (value) => {
    expect(peringatanJumlahMasuk(value, 'kedatangan')).toBe('');
  });

  it.each(['', '0', '-1', '100000.001', '1.0001', '1.', 'NaN', '1e2'])('rejects arrival %s', (value) => {
    expect(peringatanJumlahMasuk(value, 'kedatangan')).not.toBe('');
  });

  it.each(['0', '0.001', '2.375', '999999999'])('accepts purchase %s', (value) => {
    expect(peringatanJumlahMasuk(value, 'rekap')).toBe('');
  });

  it.each(['', '-1', '1000000000', '999999999.001', '1.0001', '1.', 'Infinity'])('rejects purchase %s', (value) => {
    expect(peringatanJumlahMasuk(value, 'rekap')).not.toBe('');
  });
});
