import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COMPANY_NAME } from '@/shared/lib/company';
import type { RealisasiListRow, RincianSpk } from '@/domains/inventory/components/RealisasiSPK';

const cetak = vi.hoisted(() => ({ html: '' }));
vi.mock('@/shared/lib/print-html', () => ({
  cetakHtml: vi.fn(async (html: string) => { cetak.html = html; }),
}));
vi.mock('@/shared/lib/export-excel', () => ({ exportToExcel: vi.fn() }));

import { printRealisasiPdf, printRincianPdf } from './realisasi';

const rows: RealisasiListRow[] = [
  { id: '1', noSpk: 'SPK-001', client: 'CV <Tiga>', anggaran: 5000000, realisasi: 1250000, sisa: 3750000, status: 'Untung' },
];
const rincian: RincianSpk = {
  id: '1', noSpk: 'SPK-001', client: 'CV <Tiga>', anggaran: 5000000, totalBiaya: 1000,
  rows: [{ kode: 'BRG-1', nama: 'Triplex <kayu>', satuan: 'lbr', kuota: 10, qty: 2, harga: 500, biaya: 1000 }],
};

beforeEach(() => {
  cetak.html = '';
});

describe('print realisasi SPK', () => {
  it('uses the company letterhead and escapes values in the report', async () => {
    await printRealisasiPdf(rows, 'Oktober 2026');
    const document = new DOMParser().parseFromString(cetak.html, 'text/html');
    expect(document.querySelector('.perusahaan')?.textContent).toBe(COMPANY_NAME);
    expect(document.querySelector('.meta')?.textContent).toBe('Periode: Oktober 2026');
    expect(document.body.textContent).toContain('CV <Tiga>');
    expect(document.querySelector('tbody td')?.textContent).toBe('1');
  });

  it('marks the total row bold and keeps escaped item names in the detail print', async () => {
    await printRincianPdf('biaya', rincian, rincian.rows);
    const document = new DOMParser().parseFromString(cetak.html, 'text/html');
    expect(document.querySelector('.perusahaan')?.textContent).toBe(COMPANY_NAME);
    expect(document.body.textContent).toContain('Triplex <kayu>');
    expect(document.querySelector('tbody tr.b')).not.toBeNull();
  });
});
