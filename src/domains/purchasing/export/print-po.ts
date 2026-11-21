import type { PurchaseOrder } from '@/domains/purchasing/types';
import { PEMESAN } from '@/domains/purchasing/data/pembelian';
import { formatAngka } from '@/domains/ppic/data/dokubah';
import { escapeHtml } from '@/shared/lib/escape-html';
import { dokumenLaporan, tungguGambarCetak } from '@/shared/lib/print-laporan';
import { cetakHtml } from '@/shared/lib/print-html';

const notes = [
  'Apabila supplier tidak ready stock, harus dipastikan ketersediaan / kesanggupannya secara tertulis melalui PIC yang ada.',
  'Harga barang di atas sudah termasuk ongkos kirim sampai dengan alamat pemesan.',
  'Tagihan yang dikirim harus dilampiri dengan copy Surat penerimaan pengiriman barang dan Faktur PPN.',
  'Pembayaran akan dilakukan selambat2nya 30 hari kerja setelah semua berkas diterima komplit, melalui transfer bank.',
  'PO yang diterbitkan dinyatakan syah setelah di acc oleh Direksi dan Stempel Bagian Pembelian Perusahaan.',
  'Menyesuaikan Lokasi',
];

const amountFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
const quantityFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
const amount = (value: number) => escapeHtml(amountFormatter.format(value));
const infoRow = (label: string, value: string) => `<tr><td class="info-label">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`;

export function buildPurchaseOrderHtml(po: PurchaseOrder): string {
  const rows = po.barang.map((item, index) => `<tr>
    <td class="c">${index + 1}</td><td>${escapeHtml(item.kodeBarang)}</td>
    <td>${escapeHtml(item.namaBarang)}</td><td class="c">${escapeHtml(item.satuan)}</td>
    <td class="r">${escapeHtml(quantityFormatter.format(item.jumlah))}</td><td class="r">${amount(item.hargaSatuan)}</td>
    <td class="r">${item.diskon === 0 ? '' : amount(item.diskon)}</td><td class="r">${amount(item.jumlah * item.hargaSatuan - item.diskon)}</td>
  </tr>`).join('');

  const content = `<style>
    @page { size: A4 portrait; margin: 10mm 16mm; }
    body { font-size: 9px; line-height: 1.25; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .kop { margin: 0 -10mm 0; padding: 0 3mm 3mm 26mm; min-height: 30mm; border-bottom: 1.5px solid #62687d; gap: 4mm; justify-content: flex-start; align-items: center; }
    .kop .logo { width: 27mm; height: 27mm; }
    .kop .perusahaan { font-size: 23px; letter-spacing: .2px; color: #596180; }
    .kop h1 { display: none; }
    .kop .meta { font-size: 11px; line-height: 1.2; margin: .3mm 0 0; color: #333; }
    .kop .meta:nth-of-type(5), .kop .meta:nth-of-type(6) { text-decoration: underline; }
    .po-title { text-align: center; text-decoration: underline; font-size: 12px; margin: 20mm 0 3mm; }
    table { width: 100%; margin: 0; font-size: 9px; table-layout: fixed; }
    th, td { overflow-wrap: anywhere; }
    .cancelled { text-align: center; font-size: 11px; font-weight: bold; color: #900; border: 1px solid #900; padding: 2mm; margin: 0 0 3mm; }
    .meta-row { display: flex; align-items: start; justify-content: space-between; margin-bottom: 5mm; }
    .po-meta { width: 63mm; }
    .po-meta td { border: 1px solid #777; padding: .4mm 1mm; }
    .po-meta td:last-child { text-align: center; }
    .doc-control { width: 32mm; margin-right: 35mm; font-size: 7px; }
    .doc-control td { border: 1px solid #777; padding: .5mm 1mm; }
    .doc-control td:first-child { text-align: center; }
    .parties { display: grid; grid-template-columns: 1.28fr 1fr; gap: 16mm; align-items: start; margin-bottom: 7mm; }
    .parties h2 { font-size: 8.5px; margin: 0 0 4mm; font-weight: normal; text-transform: uppercase; }
    .parties td, .parties th { border: 1px solid #777; padding: .7mm 1mm; font-weight: normal; vertical-align: middle; background: transparent; }
    .parties th { text-align: center; }
    .parties .supplier th:first-child { text-align: left; }
    .parties .supplier tr:nth-child(2) td:last-child { text-align: center; }
    .parties .address-row td { height: 13mm; }
    .parties .buyer .address-row td { height: 17mm; }
    .info-label { width: 34%; }
    .items-title { font-size: 9px; font-weight: normal; margin: 0 0 4mm; }
    .po-items th { border: 0; border-top: 1px solid #555; border-bottom: 1px solid #555; background: transparent; padding: .8mm .6mm; text-align: center; font-weight: normal; vertical-align: middle; }
    .po-items td { border: 0; border-bottom: .5px solid #aaa; padding: 1mm .6mm; }
    .po-items tfoot { display: table-row-group; }
    .po-items tfoot td { border-top: 1px solid #777; border-bottom: 1px solid #777; padding: 1.2mm .6mm; }
    .po-items .strong td { font-weight: bold; background: transparent; }
    .po-items .grand td { border-bottom: 3px double #333; font-size: 10px; }
    .dpp-label { font-weight: bold; }
    .dpp-formula { display: inline-block; margin-left: 4mm; }
    .approval-area { position: relative; isolation: isolate; break-inside: avoid; }
    .watermark { position: absolute; left: 0; right: 0; top: 43%; font-size: 24px; letter-spacing: .5px; text-align: center; color: #efefef; white-space: nowrap; z-index: -1; }
    .notes { margin-top: 4mm; font-size: 8.5px; }
    .notes p { margin: 0 0 1.5mm; font-weight: bold; font-style: italic; }
    .notes ol { margin: 0; padding-left: 5mm; font-style: italic; line-height: 1.5; }
    .signatures { margin-top: 5mm; }
    .signatures p { font-size: 8.5px; margin: 0 0 1mm; }
    .signatures .buyer-name { font-weight: bold; }
    .signatures table { margin-top: 5mm; }
    .signatures td { border: 0; padding: 0 3mm; text-align: center; font-size: 8px; }
    .signatures td:first-child { padding-left: 0; text-align: left; }
    .signatures td:last-child { padding-right: 0; }
    .signatures .sign-heading td { text-align: left; }
    .signatures .space td { height: 22mm; }
    .signature-name { display: block; min-height: 3mm; }
    .signature-role { border-top: 1px solid #555; display: block; padding-top: 1mm; }
    .signatures td:last-child .signature-role { font-style: italic; }
  </style>
  <h1 class="po-title">PURCHASE ORDER (PO)</h1>
  ${po.status === 'CANCELLED' ? `<p class="cancelled">DIBATALKAN${po.cancelReason ? `: ${escapeHtml(po.cancelReason)}` : ''}</p>` : ''}
  <div class="meta-row">
    <table class="po-meta"><tbody>
      ${infoRow('Nomor PO', po.nomorPo)}
      ${infoRow('Tanggal PO', dateFormatter.format(new Date(po.tanggalPo)))}
    </tbody></table>
    <table class="doc-control" aria-label="Kode dokumen"><tbody><tr><td rowspan="2">KEU<br>001</td><td>Rev: 00</td></tr><tr><td>Terbit:08/25</td></tr></tbody></table>
  </div>
  <div class="parties">
    <section><h2>Tujuan Pemesanan (Supplier)</h2><table class="supplier" aria-label="Tujuan pemesanan"><colgroup><col style="width:42%"><col style="width:58%"></colgroup><tbody>
      <tr><th>DATA SUPPLIER</th><th>Kod</th></tr>
      ${infoRow('Nama Perusahaan', po.supplierName)}
      <tr class="address-row"><td>Alamat / Telp</td><td>${escapeHtml([po.supplierAddress, po.supplierPhone].filter(Boolean).join(' / '))}</td></tr>
      ${infoRow('NPWP', po.supplierNpwp || '')}
      ${infoRow('No A/C (Bank)', po.supplierBank || '')}
      ${infoRow('PIC / Telp', po.picSupplier)}
    </tbody></table></section>
    <section><h2>Pemesan</h2><table class="buyer" aria-label="Pemesan"><colgroup><col style="width:39%"><col style="width:61%"></colgroup><tbody>
      <tr><th colspan="2">${escapeHtml(PEMESAN.nama)}</th></tr>
      ${infoRow('NPWP', PEMESAN.npwp)}
      <tr class="address-row"><td>Alamat Pengiriman</td><td>${escapeHtml(PEMESAN.alamatPengiriman)}</td></tr>
      ${infoRow('Kebutuhan Proyek', po.kebutuhanProyek || '')}
      ${infoRow('PIC / Telp', PEMESAN.pic)}
    </tbody></table></section>
  </div>
  <h2 class="items-title">Daftar / Spesifikasi Barang yang Dipesan:</h2>
  <table class="po-items"><colgroup>${[4, 10, 40, 7, 7, 12, 8, 12].map((width) => `<col style="width:${width}%">`).join('')}</colgroup>
    <thead><tr><th>No</th><th>Kode Barang</th><th>Nama Item / Barang</th><th>Satuan</th><th>Jumlah</th><th>Harga/Sat<br>(Rp)</th><th>Diskon<br>(Rp)</th><th>TOTAL HARGA (Rp)</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr class="strong"><td colspan="7">TOTAL HARGA SETELAH DISKON</td><td class="r">${amount(po.subtotal)}</td></tr>
      <tr><td colspan="4"><span class="dpp-label">DPP LAIN :</span><span class="dpp-formula">${escapeHtml(formatAngka(po.subtotal))} &nbsp; X &nbsp; 11/12 &nbsp; = &nbsp; ${escapeHtml(formatAngka(po.dppLain))}</span></td><td colspan="2" class="c"><strong>PPN</strong></td><td class="c">${amount(po.persenPpn)}%</td><td class="r">${amount(po.nilaiPpn)}</td></tr>
      <tr class="strong"><td colspan="6">TOTAL HARGA SETELAH PPN</td><td class="r">Rp.</td><td class="r">${amount(po.subtotal + po.nilaiPpn)}</td></tr>
      <tr><td colspan="7">JASA</td><td class="r">${amount(po.jasa)}</td></tr>
      <tr class="strong grand"><td colspan="7">GRAND TOTAL</td><td class="r">${amount(po.grandTotal)}</td></tr>
    </tfoot>
  </table>
  <div class="approval-area">
    <div class="watermark" aria-hidden="true">DHARMA PUTRA SEJAHTERA ABADI</div>
    <section class="notes"><p>Catatan :</p><ol>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ol></section>
    <section class="signatures"><p>Pemesan,</p><p class="buyer-name">${escapeHtml(PEMESAN.nama)}</p>
      <table><colgroup>${[24, 14, 16, 22, 24].map((width) => `<col style="width:${width}%">`).join('')}</colgroup><tbody>
        <tr class="sign-heading"><td colspan="2">Diajukan oleh</td><td>Diperiksa oleh</td><td colspan="2"></td></tr>
        <tr class="space"><td></td><td></td><td></td><td></td><td></td></tr>
        <tr>${['Dept. Keu /Bag pemb', 'Marketing', 'PPIC', 'Dir Operasional', 'Direktur Utama'].map((role, index) => `<td><span class="signature-name">${index === 4 ? 'Yosef Boyke Dharma' : ''}</span><span class="signature-role">${escapeHtml(role)}</span></td>`).join('')}</tr>
      </tbody></table>
    </section>
  </div>`;

  return dokumenLaporan('PURCHASE ORDER (PO)', [
    'Interior & Furniture Manufacture',
    PEMESAN.alamatPengiriman,
    'Telepon : (0274) 2800089 Fax : (0274) 4332248 Hp : 0811-2850-7788',
    'E-Mail : dharmaputra04@yahoo.com, dharmaputra888@gmail.com',
    'website : www.dharmaputrainterior.co.id',
  ], content);
}

export function printPurchaseOrder(po: PurchaseOrder): Promise<void> {
  return cetakHtml(buildPurchaseOrderHtml(po), `PO ${po.nomorPo}`, tungguGambarCetak);
}

export function buildPurchaseOrdersHtml(orders: PurchaseOrder[]): string {
  if (orders.length === 0) throw new Error('Pilih minimal satu PO untuk dicetak.');
  const parser = new DOMParser();
  const document = parser.parseFromString(buildPurchaseOrderHtml(orders[0]), 'text/html');
  document.title = `Purchase Order (${orders.length})`;
  document.body.replaceChildren();
  const style = document.createElement('style');
  style.textContent = '.po-sheet { break-after: page; page-break-after: always; } .po-sheet:last-child { break-after: auto; page-break-after: auto; }';
  document.head.appendChild(style);
  for (const po of orders) {
    const source = parser.parseFromString(buildPurchaseOrderHtml(po), 'text/html');
    const sheet = document.createElement('section');
    sheet.className = 'po-sheet';
    for (const node of Array.from(source.body.childNodes)) sheet.appendChild(document.importNode(node, true));
    document.body.appendChild(sheet);
  }
  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}

export function printPurchaseOrders(orders: PurchaseOrder[]): Promise<void> {
  return cetakHtml(buildPurchaseOrdersHtml(orders), `PO terpilih (${orders.length})`, tungguGambarCetak);
}
