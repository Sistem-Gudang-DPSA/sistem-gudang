import { fmtQty, fmtRp, type RealisasiTable } from '@/domains/inventory/components/RealisasiSPK';

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function exportRealisasiExcel(t: RealisasiTable) {
  const XLSX = await import('xlsx');
  const n = t.spks.length;
  const base = ['No.', 'Kode Barang', 'Nama Barang', 'Harga Satuan'];
  const header: string[][] =
    n === 0
      ? [base]
      : [
          [...base, t.client, ...Array(n * 2 - 1).fill('')],
          ['', '', '', '', ...t.spks.flatMap((no) => [no, ''])],
          ['', '', '', '', ...t.spks.flatMap(() => ['Jumlah', 'Biaya'])],
        ];
  const body = t.rows.map((r, i) => [i + 1, r.code, r.name, r.price, ...r.cells.flatMap((c) => [c.qty, c.cost])]);
  const total = ['Total pengeluaran', '', '', '', ...t.totals.flatMap((v) => ['', v])];
  const aoa = [['REALISASI SPK'], [], ...header, ...body, total];

  const h = 2; // baris header dimulai setelah judul dan baris kosong
  const merges = [
    ...[0, 1, 2, 3].map((c) => ({ s: { r: h, c }, e: { r: h + header.length - 1, c } })),
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 3 } },
  ];
  if (n > 0) {
    merges.push({ s: { r: h, c: 4 }, e: { r: h, c: 3 + n * 2 } });
    t.spks.forEach((_, i) => merges.push({ s: { r: h + 1, c: 4 + i * 2 }, e: { r: h + 1, c: 5 + i * 2 } }));
  }
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet['!merges'] = merges;
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Realisasi SPK');
  XLSX.writeFile(book, `Realisasi_SPK_${t.client || 'Semua'}.xlsx`);
}

// Dipanggil langsung dari klik tombol supaya jendela tidak diblokir browser
export function printRealisasiPdf(t: RealisasiTable) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak PDF.');
    return;
  }
  const n = t.spks.length;
  const head =
    n === 0
      ? '<tr><th>No.</th><th>Kode Barang</th><th>Nama Barang</th><th class="r">Harga Satuan</th></tr>'
      : `<tr><th rowspan="3">No.</th><th rowspan="3">Kode Barang</th><th rowspan="3">Nama Barang</th><th rowspan="3" class="r">Harga Satuan</th><th colspan="${n * 2}" class="c">${esc(t.client)}</th></tr>
         <tr>${t.spks.map((no) => `<th colspan="2" class="c">${esc(no)}</th>`).join('')}</tr>
         <tr>${t.spks.map(() => '<th class="r">Jumlah</th><th class="r">Biaya</th>').join('')}</tr>`;
  const body = t.rows
    .map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(r.code)}</td><td>${esc(r.name)}</td><td class="r">${fmtRp(r.price)}</td>
      ${r.cells.map((c) => `<td class="r">${c.qty ? fmtQty(c.qty) : 0}</td><td class="r">${fmtRp(c.cost)}</td>`).join('')}</tr>`)
    .join('');
  const total = `<tr><td colspan="4"><b>Total pengeluaran</b></td>${t.totals.map((v) => `<td></td><td class="r"><b>${fmtRp(v)}</b></td>`).join('')}</tr>`;
  win.document.write(`<!doctype html><html><head><title>Realisasi SPK</title><style>
    @page { size: landscape; }
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: middle; }
    th { background: #eee; } .c { text-align: center; } .r { text-align: right; }
  </style></head><body><h1>Realisasi SPK${t.client ? ` · ${esc(t.client)}` : ''}</h1>
  <table><thead>${head}</thead><tbody>${body}${total}</tbody></table></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}