import { describe, expect, it } from 'vitest';
import { dokumenLaporan } from './print-laporan';

const identitas = { kode: 'PPIC', nomor: '002', revisi: '00', terbit: '08/25' };

describe('dokumenLaporan', () => {
  it('menampilkan kop secara default dan dapat menghilangkannya tanpa mengubah isi laporan', () => {
    const parser = new DOMParser();
    const defaultDoc = parser.parseFromString(dokumenLaporan('Laporan', [], '<p>isi</p>'), 'text/html');
    expect(defaultDoc.querySelector('.kop img')).not.toBeNull();

    const tanpaKop = parser.parseFromString(dokumenLaporan('Laporan', [], '<p>isi</p>', false, undefined, { tampilkanKop: false }), 'text/html');
    expect(tanpaKop.querySelector('.kop')).toBeNull();
    expect(tanpaKop.querySelector('img')).toBeNull();
    expect(tanpaKop.body.textContent?.trim()).toBe('isi');
    expect(tanpaKop.title).toBe('Laporan');
  });

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
