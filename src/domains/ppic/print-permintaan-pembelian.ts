import { todayIso } from '@/domains/inventory/date';
import { cetakLaporan } from '@/shared/lib/print-laporan';
import { escapeHtml } from '@/shared/lib/escape-html';

// Tanggal terbit formulir mengikuti tanggal surat (tanggal pengajuan), format MM/YY.
const tanggalTerbit = (iso: string) => {
  const [tahun, bulan] = iso.split('-');
  return tahun && bulan ? `${bulan}/${tahun.slice(-2)}` : '-';
};

type PrintHeader = { bagian: string; namaPemohon: string; jabatan: string; tanggalPengajuan: string; periode: string };
type PrintRow = { tanggal?: string; supplier?: string; namaBarang: string; qty: string; satuan: string; proyek: string; keterangan?: string; dikirimTanggal?: string };

export const penyetujuPermintaanPembelian = (bagian: string) => /^gudang(?:\s|$)/i.test(bagian.trim()) ? 'PPIC' : 'Bag. Purchasing';

export function cetakFormPermintaanPembelian(header: PrintHeader, rows: PrintRow[]) {

    const isiBaris = rows.map((row, i) => `<tr>
        <td class="c">${i + 1}</td>
        <td>${row.tanggal ? escapeHtml(row.tanggal) : '-'}</td>
        <td>${row.supplier ? escapeHtml(row.supplier) : '-'}</td>
        <td>${row.namaBarang ? escapeHtml(row.namaBarang) : '-'}</td>
        <td class="c">${row.qty ? escapeHtml(row.qty) : '-'}</td>
        <td class="c">${row.satuan ? escapeHtml(row.satuan) : '-'}</td>
        <td>${row.proyek ? escapeHtml(row.proyek) : '-'}</td>
        <td>${row.keterangan ? escapeHtml(row.keterangan) : '-'}</td>
        <td>${row.dikirimTanggal ? escapeHtml(row.dikirimTanggal) : '-'}</td>
      </tr>`).join('');
    const isi = `<table>
        <colgroup><col style="width:5%" /><col style="width:12%" /><col style="width:16%" /><col style="width:22%" /><col style="width:6%" /><col style="width:6%" /><col style="width:12%" /><col style="width:12%" /><col style="width:9%" /></colgroup>
        <thead><tr>
          <th class="c">No</th><th>Tanggal</th><th>Supplier</th><th>Nama Barang</th><th class="c">QTY</th><th class="c">SAT</th><th>Proyek</th><th>Keterangan</th><th>Dikirim Tanggal</th>
        </tr></thead>
        <tbody>${isiBaris || '<tr><td colspan="9" class="c">Belum ada barang.</td></tr>'}</tbody>
      </table>
      <table style="border:0; margin-top:14mm; font-size:12px;">
        <tbody><tr>
          <td style="border:0; text-align:center; width:50%;">Dibuat<div style="height:16mm"></div>Kepala Gudang</td>
          <td style="border:0; text-align:center; width:50%;">Disetujui Oleh<div style="height:16mm"></div>${penyetujuPermintaanPembelian(header.bagian)}</td>
        </tr></tbody>
      </table>`;
    return cetakLaporan('Form Permintaan Pembelian Bahan Baku', isi, {
        meta: [
          `Bagian/Sub bagian: ${header.bagian || '-'}`,
          `Nama: ${header.namaPemohon || '-'}  |  Jabatan: ${header.jabatan || '-'}`,
          `Tanggal Pengajuan: ${header.tanggalPengajuan || '-'}`,
          ...(header.periode.trim() ? [`Periode: ${header.periode.trim()}`] : []),
        ],
        label: 'permintaan pembelian',
        // Identitas formulir PPIC di kanan atas; tanggal terbit mengikuti tanggal surat.
        identitas: { kode: 'PPIC', nomor: '002', revisi: '00', terbit: tanggalTerbit(header.tanggalPengajuan || todayIso()) },
      });
}
