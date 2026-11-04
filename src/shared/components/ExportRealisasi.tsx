import { escapeHtml } from '@/shared/lib/escape-html';
import { fmtQty, fmtRp, type RealisasiTable, type RekapBulanan } from '@/domains/inventory/components/RealisasiSPK';

const F = 5; // kolom tetap: No, Kode, Nama, Harga, Total Pengambilan

const namaFile = (t: RealisasiTable) =>
  `Realisasi_SPK_${t.client || 'Semua'}_${t.periode}.xlsx`.replace(/[^\w.-]+/g, '_');

export async function exportRealisasiExcel(t: RealisasiTable) {
  const XLSX = await import('xlsx');
  const n = t.spks.length;
  const base = ['No.', 'Kode Barang', 'Nama Barang', 'Harga Satuan', 'Total Pengambilan'];
  const blank = Array<string>(F).fill('');
  const header: string[][] =
    n === 0
      ? [base]
      : [
          [...base, t.client, ...Array<string>(n * 2 - 1).fill('')],
          [...blank, ...t.spks.flatMap((no) => [no, ''])],
          [...blank, ...t.spks.flatMap(() => ['Jumlah', 'Biaya'])],
        ];
  const body = t.rows.map((r, i) => [i + 1, r.code, r.name, r.price, r.totalQty, ...r.cells.flatMap((c) => [c.qty, c.cost])]);
  const total = ['Total pengeluaran', ...Array<string>(F - 1).fill(''), ...t.totals.flatMap((v) => ['', v])];
  const top = [['REALISASI SPK'], ['Client', t.client || '-'], ['Periode', t.periode], []];
  const aoa = [...top, ...header, ...body, total];

  const h = top.length; 
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: F - 1 } },
  ];
  if (n > 0) {
    for (let c = 0; c < F; c++) merges.push({ s: { r: h, c }, e: { r: h + 2, c } });
    merges.push({ s: { r: h, c: F }, e: { r: h, c: F + n * 2 - 1 } });
    t.spks.forEach((_, i) => merges.push({ s: { r: h + 1, c: F + i * 2 }, e: { r: h + 1, c: F + i * 2 + 1 } }));
  }
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet['!merges'] = merges;
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Realisasi SPK');
  XLSX.writeFile(book, namaFile(t));
}

export function printRealisasiPdf(t: RealisasiTable) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak PDF.');
    return;
  }
  win.opener = null;
  const n = t.spks.length;
  const rs = n > 0 ? 3 : 1;
  const fixed = `<th rowspan="${rs}">No.</th><th rowspan="${rs}">Kode Barang</th><th rowspan="${rs}">Nama Barang</th>
    <th rowspan="${rs}" class="r">Harga Satuan</th><th rowspan="${rs}" class="r">Total Pengambilan</th>`;
  const head =
    n === 0
      ? `<tr>${fixed}</tr>`
      : `<tr>${fixed}<th colspan="${n * 2}" class="c">${escapeHtml(t.client)}</th></tr>
         <tr>${t.spks.map((no) => `<th colspan="2" class="c">${escapeHtml(no)}</th>`).join('')}</tr>
         <tr>${t.spks.map(() => '<th class="r">Jumlah</th><th class="r">Biaya</th>').join('')}</tr>`;
  const body = t.rows
    .map(
      (r, i) => `<tr><td class="c">${i + 1}</td><td>${escapeHtml(r.code)}</td><td>${escapeHtml(r.name)}</td>
      <td class="r">${fmtRp(r.price)}</td><td class="r">${fmtQty(r.totalQty)}</td>
      ${r.cells.map((c) => `<td class="r">${fmtQty(c.qty)}</td><td class="r">${fmtRp(c.cost)}</td>`).join('')}</tr>`,
    )
    .join('');
  const total = `<tr><td colspan="${F}"><b>Total pengeluaran</b></td>${t.totals
    .map((v) => `<td></td><td class="r"><b>${fmtRp(v)}</b></td>`)
    .join('')}</tr>`;
  win.document.write(`<!doctype html><html><head><title>Realisasi SPK</title><style>
    @page { size: landscape; }
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 4px; } .meta { font-size: 12px; margin-bottom: 12px; color: #444; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: middle; }
    th { background: #eee; } .c { text-align: center; } .r { text-align: right; }
  </style></head><body><h1>Realisasi SPK</h1>
  <div class="meta">Client: <b>${escapeHtml(t.client || '-')}</b> · Periode: <b>${escapeHtml(t.periode)}</b></div>
  <table><thead>${head}</thead><tbody>${body}${total}</tbody></table></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

export async function exportRekapBulananExcel(d: RekapBulanan) {
  const XLSX = await import('xlsx');
  const FR = 3; 
  const n = d.kolom.length;

  // ----- Sheet 1: matriks barang x (client > SPK) -----
  const row1: (string | number)[] = ['No.', 'Nama Barang', 'Biaya (Harga Satuan)', ...Array<string>(n).fill('')];
  const groups: { start: number; end: number }[] = [];
  d.kolom.forEach((k, i) => {
    if (i === 0 || d.kolom[i - 1].client !== k.client) {
      row1[FR + i] = k.client;
      groups.push({ start: FR + i, end: FR + i });
    } else {
      groups[groups.length - 1].end = FR + i;
    }
  });
  const row2 = ['', '', '', ...d.kolom.map((k) => k.noSpk)];
  const body = d.rows.map((r, i) => [i + 1, r.name, r.price, ...r.qty]);
  const total = ['Total pengeluaran (Rp)', '', '', ...d.biaya];
  const top = [['REKAP REALISASI SPK BULANAN'], ['Periode', d.periode], []];
  const aoa = [...top, row1, row2, ...body, total];

  const h = top.length;
  const merges = [
    ...[0, 1, 2].map((c) => ({ s: { r: h, c }, e: { r: h + 1, c } })),
    ...groups.map((g) => ({ s: { r: h, c: g.start }, e: { r: h, c: g.end } })),
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: FR - 1 } },
  ];
  const sheet1 = XLSX.utils.aoa_to_sheet(aoa);
  sheet1['!merges'] = merges;

  const rekap: (string | number)[][] = [['REKAP PENGELUARAN PER CLIENT'], ['Periode', d.periode], [], ['Client', 'No. SPK', 'Total Pengeluaran']];
  let grand = 0;
  for (const client of [...new Set(d.kolom.map((k) => k.client))]) {
    let sub = 0;
    d.kolom.forEach((k, i) => {
      if (k.client !== client) return;
      rekap.push([client, k.noSpk, d.biaya[i]]);
      sub += d.biaya[i];
    });
    rekap.push([`Subtotal ${client}`, '', sub]);
    grand += sub;
  }
  rekap.push(['Total keseluruhan', '', grand]);
  const sheet2 = XLSX.utils.aoa_to_sheet(rekap);

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet1, 'Realisasi');
  XLSX.utils.book_append_sheet(book, sheet2, 'Rekap');
  XLSX.writeFile(book, `Rekap_Realisasi_SPK_${d.periode}.xlsx`.replace(/[^\w.-]+/g, '_'));
}