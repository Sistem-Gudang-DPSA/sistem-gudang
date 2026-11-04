import { escapeHtml } from '@/shared/lib/escape-html';
import { exportToExcel } from '@/shared/lib/export-excel';
import { statusRealisasi, type RealisasiListRow, type RincianRow, type RincianSpk } from '@/domains/inventory/components/RealisasiSPK';

type Cell = string | number;
type Mode = 'biaya' | 'material';
const safeName = (s: string) => s.replace(/[^\w.-]+/g, '_');
const rp = (n: number) => n.toLocaleString('id-ID');
const orDash = (v: number | string | null) => (v === null ? '-' : v);

// ---------- Jendela cetak ----------
export function openPrintWindow() {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak PDF.');
    return null;
  }
  win.opener = null;
  win.document.write('<p style="font-family:Arial;padding:24px">Menyiapkan data...</p>');
  return win;
}

function writePrint(win: Window, title: string, meta: string[], headers: string[], body: Cell[][], boldLast = false) {
  const cell = (v: Cell) => (typeof v === 'number' ? `<td class="r">${rp(v)}</td>` : `<td>${escapeHtml(v)}</td>`);
  const rows = body
    .map((r, i) => `<tr${boldLast && i === body.length - 1 ? ' class="b"' : ''}>${r.map(cell).join('')}</tr>`)
    .join('');
  win.document.open();
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    @page { size: landscape; }
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 8px; } .meta { font-size: 12px; color: #444; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
    th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
    th { background: #eee; } .r { text-align: right; } .b td { font-weight: bold; background: #f5f5f5; }
  </style></head><body><h1>${escapeHtml(title)}</h1>
  ${meta.map((m) => `<div class="meta">${escapeHtml(m)}</div>`).join('')}
  <table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
  </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

// ---------- Daftar SPK ----------
const listHeaders = ['No.', 'No. SPK', 'Klien & Proyek', 'Anggaran', 'Realisasi', 'Sisa Anggaran', 'Status'];
const listBody = (rows: RealisasiListRow[]): Cell[][] =>
  rows.map((r, i) => [i + 1, r.noSpk, r.client, orDash(r.anggaran), r.realisasi, orDash(r.sisa), orDash(r.status)]);

export const exportRealisasiExcel = (rows: RealisasiListRow[], periode: string) =>
  exportToExcel({ filename: `Realisasi_SPK_${safeName(periode)}.xlsx`, sheetName: 'Realisasi SPK', headers: listHeaders, rows: listBody(rows) });

export const printRealisasiPdf = (win: Window, rows: RealisasiListRow[], periode: string) =>
  writePrint(win, 'Realisasi SPK', [`Periode: ${periode}`, 'Sumber: Barang Keluar (belum dari dokubah PPIC)'], listHeaders, listBody(rows));

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

export function exportRincianExcel(mode: Mode, r: RincianSpk, rows: RincianRow[]) {
  const { headers, body } = rincianTable(mode, r, rows);
  return exportToExcel({
    filename: `${mode === 'biaya' ? 'Rincian_Biaya' : 'Material_Terpakai'}_${safeName(r.noSpk)}.xlsx`,
    sheetName: mode === 'biaya' ? 'Rincian Biaya' : 'Material',
    headers,
    rows: body,
  });
}

export function printRincianPdf(win: Window, mode: Mode, r: RincianSpk, rows: RincianRow[]) {
  const { headers, body } = rincianTable(mode, r, rows);
  writePrint(win, mode === 'biaya' ? 'Rincian Biaya SPK' : 'Material Terpakai per SPK', rincianMeta(mode, r), headers, body, mode === 'biaya');
}