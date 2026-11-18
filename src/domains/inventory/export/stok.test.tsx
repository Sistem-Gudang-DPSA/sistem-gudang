import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KartuStokData } from '@/domains/inventory/components/KartuStok';
import { COMPANY_NAME } from '@/shared/lib/company';

const cetak = vi.hoisted(() => ({ html: '', calls: 0 }));
vi.mock('@/shared/lib/print-html', () => ({
  cetakHtml: vi.fn(async (html: string) => { cetak.html = html; cetak.calls += 1; }),
}));

const xlsx = vi.hoisted(() => ({
  aoa_to_sheet: vi.fn((rows: unknown[][]) => rows),
  book_new: vi.fn(() => ({})),
  book_append_sheet: vi.fn(),
  writeFile: vi.fn(),
}));
vi.mock('xlsx', () => ({ utils: xlsx, writeFile: xlsx.writeFile }));

import { exportKartuExcel, printKartuPdf } from './stok';

const entry = {
  id: 'out-1', date: '2026-11-03', createdAt: '2026-11-03T01:00:00Z', type: 'KELUAR' as const,
  project: 'Kursi tamu', client: 'CV Tiga Saudara', spk: 'SPK-005', noTransaksi: 'OUT-1',
  usage: 'Pengambilan oleh Pak Mul', qtyIn: 0, qtyOut: 5, note: null,
};
const data: KartuStokData = {
  item: { id: 7, code: 'BRG-7', name: 'Triplex', unit: 'Lembar', stock: 116 },
  openingBalance: 110,
  entries: [entry, { ...entry, id: 'out-3', noTransaksi: 'OUT-3', qtyOut: 4 }],
};
const kartu = {
  rows: [{ ...data.entries[0], saldo: 125 }, { ...data.entries[1], saldo: 118 }],
  totalIn: 0, totalOut: 9, saldoAkhir: 116,
};

beforeEach(() => {
  vi.clearAllMocks();
  cetak.html = '';
  cetak.calls = 0;
});

describe('filtered stock card exports', () => {
  it('writes visible transactions and their original balances to Excel', async () => {
    await exportKartuExcel(data, kartu);
    const rows = xlsx.aoa_to_sheet.mock.calls[0][0];
    const header = rows.findIndex((row) => row[0] === 'No.');
    expect(rows[header][3]).toBe('Penggunaan');
    expect(rows[header + 1][6]).toBe(110);
    expect(rows[header + 2]).toEqual([1, '03-11-2026', 'Kursi tamu (SPK-005)', 'CV Tiga Saudara', '', 5, 125, 'OUT-1\nPengambilan oleh Pak Mul']);
    expect(rows[header + 3][6]).toBe(118);
    expect(rows[header + 4]).toEqual(['', '', '', 'Total / Saldo akhir', 0, 9, 116, '']);
    expect(xlsx.writeFile).toHaveBeenCalledWith(expect.any(Object), 'Kartu_Stok_BRG-7.xlsx');
  });

  it('prints the company letterhead, filtered totals and original ledger balances', async () => {
    await printKartuPdf(data, kartu);
    const document = new DOMParser().parseFromString(cetak.html, 'text/html');
    expect(document.querySelector('.perusahaan')?.textContent).toBe(COMPANY_NAME);
    expect(document.querySelector('.logo')?.getAttribute('src')).toContain('logo-perusahaan.jpg');
    const rows = [...document.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(4);
    expect(rows[0].textContent).toContain('110');
    expect(rows[1].querySelectorAll('td')[3].textContent).toBe('CV Tiga Saudara');
    expect(rows[1].querySelectorAll('td')[6].textContent).toBe('125');
    expect(rows[2].querySelectorAll('td')[6].textContent).toBe('118');
    expect(rows[3].querySelectorAll('td')[2].textContent).toBe('9');
    expect(rows[3].querySelectorAll('td')[3].textContent).toBe('116');
    expect(cetak.calls).toBe(1);
  });
});
