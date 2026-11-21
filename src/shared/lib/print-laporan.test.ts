import { describe, expect, it } from 'vitest';
import { dokumenLaporan } from './print-laporan';

const identitas = { kode: 'PPIC', nomor: '002', revisi: '00', terbit: '08/25' };

describe('dokumenLaporan', () => {
  it('menampilkan kotak identitas di kop hanya bila diminta', () => {
    const denganIdentitas = dokumenLaporan('Form', [], '<p>isi</p>', false, identitas);
    expect(denganIdentitas).toContain('class="identitas-dokumen"');
    expect(denganIdentitas).toContain('PPIC<br />002');
    expect(denganIdentitas).toContain('Rev : 00');
    expect(denganIdentitas).toContain('Terbit : 08/25');

    expect(dokumenLaporan('Laporan', [], '<p>isi</p>')).not.toContain('class="identitas-dokumen"');
  });

  it('meng-escape isi kotak identitas', () => {
    const html = dokumenLaporan('Form', [], '', false, { ...identitas, kode: '<script>' });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });
});
