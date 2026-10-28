// domains/inventory/export/kartu-stok.ts
import { escapeHtml } from '@/shared/lib/escape-html';
import { displayDate } from '@/domains/inventory/date';
import type { ItemListRow } from '@/domains/inventory/types';
import { buildKartu, type KartuStokData } from '@/domains/inventory/components/KartuStok';

// Dipanggil langsung dari klik tombol supaya jendela tidak diblokir browser
function printHtml(title: string, body: string) {
  const win = window.open('', '_blank');
  if (win) win.opener = null;
  if (!win) {
    alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak PDF.');
    return;
  }
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    .meta { font-size: 12px; margin-bottom: 12px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #eee; }
    .c { text-align: center; } .r { text-align: right; } .sub { color: #555; font-size: 11px; }
  </style></head><body>${body}</body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

// ---------- Daftar barang (halaman utama) ----------
export async function exportDaftarExcel(rows: ItemListRow[]) {
  const XLSX = await import('xlsx');
  const data = rows.map((item, i) => ({
    'No.': i + 1,
    'Kode Barang': item.code ?? '-',
    'Kode Bawaan': item.externalCode ?? '-',
    'Nama Barang': item.name,
    'Satuan': item.unit,
    'Stok Saat Ini': item.stock,
  }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data), 'Kartu Stok');
  XLSX.writeFile(book, 'Daftar_Kartu_Stok.xlsx');
}

export function printDaftarPdf(rows: ItemListRow[]) {
  const body = rows.map((item, i) => `<tr>
    <td class="c">${i + 1}</td><td>${escapeHtml(item.code ?? '-')}</td><td>${escapeHtml(item.externalCode ?? '-')}</td>
    <td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.unit)}</td><td class="r">${item.stock}</td></tr>`).join('');
  printHtml('Daftar Kartu Stok', `<h1>Daftar Kartu Stok</h1>
    <table><thead><tr><th class="c">No.</th><th>Kode Barang</th><th>Kode Bawaan</th><th>Nama Barang</th><th>Satuan</th><th class="r">Stok Saat Ini</th></tr></thead>
    <tbody>${body}</tbody></table>`);
}

// ---------- Kartu stok satu barang (halaman detail) ----------
export async function exportKartuExcel(data: KartuStokData) {
  const XLSX = await import('xlsx');
  const { rows, saldoAkhir } = buildKartu(data);
  const sheet = XLSX.utils.aoa_to_sheet([
    ['KARTU STOK'],
    ['Kode Barang', data.item.code ?? '-'],
    ['Nama Barang', data.item.name],
    ['Satuan', data.item.unit],
    [],
    ['No.', 'Tanggal', 'Nama Proyek', 'Penggunaan', 'Masuk', 'Keluar', 'Saldo', 'Keterangan'],
    ['', '', '', 'Saldo awal', '', '', data.openingBalance, ''],
    ...rows.map((r, i) => [i + 1, displayDate(r.date), r.project ?? '-', r.usage, r.qtyIn || '', r.qtyOut || '', r.saldo, r.note ?? '']),
    ['', '', '', 'Saldo akhir', '', '', saldoAkhir, ''],
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Kartu Stok');
  XLSX.writeFile(book, `Kartu_Stok_${data.item.code ?? data.item.id}.xlsx`);
}

export function printKartuPdf(data: KartuStokData) {
  const { rows, saldoAkhir } = buildKartu(data);
  const body = rows.map((r, i) => `<tr>
    <td class="c">${i + 1}</td><td>${escapeHtml(displayDate(r.date))}</td>
    <td>${escapeHtml(r.project ?? '-')}<div class="sub">${escapeHtml(r.usage)}</div></td>
    <td class="r">${r.qtyIn || ''}</td><td class="r">${r.qtyOut || ''}</td><td class="r">${r.saldo}</td><td>${escapeHtml(r.note ?? '')}</td></tr>`).join('');
  printHtml(`Kartu Stok ${data.item.name}`, `<h1>Kartu Stok</h1>
    <div class="meta">Kode: <b>${escapeHtml(data.item.code ?? '-')}</b><br>Nama: <b>${escapeHtml(data.item.name)}</b><br>Satuan: ${escapeHtml(data.item.unit)}</div>
    <table><thead><tr><th class="c">No.</th><th>Tanggal</th><th>Informasi Mutasi</th><th class="r">Masuk</th><th class="r">Keluar</th><th class="r">Saldo</th><th>Keterangan</th></tr></thead>
    <tbody><tr><td></td><td></td><td><b>Saldo awal</b></td><td></td><td></td><td class="r">${data.openingBalance}</td><td></td></tr>
    ${body}
    <tr><td></td><td></td><td><b>Saldo akhir</b></td><td></td><td></td><td class="r"><b>${saldoAkhir}</b></td><td></td></tr></tbody></table>`);
}