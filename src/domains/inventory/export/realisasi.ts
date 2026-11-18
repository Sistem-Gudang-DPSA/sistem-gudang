import { escapeHtml } from '@/shared/lib/escape-html';
import { exportToExcel } from '@/shared/lib/export-excel';
import { cetakLaporan } from '@/shared/lib/print-laporan';
import { statusRealisasi, type RealisasiListRow, type RincianRow, type RincianSpk } from '@/domains/inventory/components/RealisasiSPK';

type Cell = string | number;
type Mode = 'biaya' | 'material';
const safeName = (s: string) => s.replace(/[^\w.-]+/g, '_');
const rp = (n: number) => n.toLocaleString('id-ID');
const orDash = (v: number | string | null) => (v === null ? '-' : v);

// Tabel cetak memakai kelas .r dan .b dari kop laporan bersama.
function tabel(headers: string[], body: Cell[][], boldLast = false) {
  const cell = (v: Cell) => (typeof v === 'number' ? `<td class="r">${rp(v)}</td>` : `<td>${escapeHtml(v)}</td>`);
  const rows = body
    .map((r, i) => `<tr${boldLast && i === body.length - 1 ? ' class="b"' : ''}>${r.map(cell).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

// ---------- Daftar SPK ----------
const listHeaders = ['No.', 'No. SPK', 'Klien & Proyek', 'Anggaran', 'Realisasi', 'Sisa Anggaran', 'Status'];
const listBody = (rows: RealisasiListRow[]): Cell[][] =>
  rows.map((r, i) => [i + 1, r.noSpk, r.client, orDash(r.anggaran), r.realisasi, orDash(r.sisa), orDash(r.status)]);

export const exportRealisasiExcel = (rows: RealisasiListRow[], periode: string) =>
  exportToExcel({ filename: `Realisasi_SPK_${safeName(periode)}.xlsx`, sheetName: 'Realisasi SPK', headers: listHeaders, rows: listBody(rows) });

export const printRealisasiPdf = (rows: RealisasiListRow[], periode: string) =>
  cetakLaporan('Realisasi SPK', tabel(listHeaders, listBody(rows)), {
    meta: [`Periode: ${periode}`, 'Sumber: Barang Keluar (belum dari dokubah PPIC)'],
    label: 'realisasi SPK',
    landscape: true,
  });

// ---------- Rincian satu SPK ----------
function rincianTable(mode: Mode, r: RincianSpk, rows: RincianRow[]) {
  if (mode === 'biaya') {
    return {
      headers: ['No.', 'Kode Barang', 'Nama Barang', 'Satuan', 'Harga Satuan', 'Jumlah', 'Biaya'],
      body: [
        ...rows.map((x, i): Cell[] => [i + 1, x.kode, x.nama, x.satuan, x.harga, x.qty, x.biaya]),
        ['', '', 'Total biaya', '', '', '', r.totalBiaya] as Cell[],
      ],
    };
  }
  return {
    headers: ['No.', 'Kode Barang', 'Nama Bahan', 'Satuan', 'Kuota', 'Terpakai', 'Sisa Kuota'],
    body: rows.map((x, i): Cell[] => [i + 1, x.kode, x.nama, x.satuan, x.kuota, x.qty, x.kuota - x.qty]),
  };
}

const rincianMeta = (mode: Mode, r: RincianSpk) =>
  mode === 'biaya'
    ? r.anggaran === null
      ? [`No. SPK: ${r.noSpk}`, `Client: ${r.client}`, `Realisasi: ${rp(r.totalBiaya)}`, 'Sumber: Barang Keluar (belum dari dokubah PPIC)']
      : [`No. SPK: ${r.noSpk}`, `Client: ${r.client}`, `Anggaran: ${rp(r.anggaran)}`, `Realisasi: ${rp(r.totalBiaya)}`, `Sisa: ${rp(r.anggaran - r.totalBiaya)} (${statusRealisasi(r.anggaran, r.totalBiaya)})`]
    : [`No. SPK: ${r.noSpk}`, `Client: ${r.client}`];

export function exportRincianExcel(
  mode: Mode,
  r: RincianSpk,
  rows: RincianRow[]
) {
  const { headers, body } = rincianTable(mode, r, rows);

  return exportToExcel({
    filename: `${mode === 'biaya' ? 'Rincian_Biaya' : 'Material_Terpakai'}_${safeName(r.noSpk)}.xlsx`,
    sheetName: mode === 'biaya' ? 'Rincian Biaya' : 'Material',
    headers,
    rows: body,
  });
}

export function printRincianPdf(
  mode: Mode,
  r: RincianSpk,
  rows: RincianRow[]
) {
  const { headers, body } = rincianTable(mode, r, rows);
  const judul = mode === 'biaya' ? 'Rincian Biaya SPK' : 'Material Terpakai per SPK';

  return cetakLaporan(judul, tabel(headers, body, mode === 'biaya'), {
    meta: rincianMeta(mode, r),
    label: judul.toLowerCase(),
    landscape: true,
  });
}
