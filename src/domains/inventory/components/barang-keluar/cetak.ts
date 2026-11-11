import { getItem } from "@/domains/inventory/api";
import { displayDate } from "@/domains/inventory/date";
import { cetakFormulir, dokumenFormulir, lembarFormulir, lembarPerHalaman, tabelMaterial, type KopFormulir } from "@/domains/inventory/print-formulir";
import type { OutboundRow, RecipientType } from "@/domains/inventory/types";
import { escapeHtml } from "@/shared/lib/escape-html";
import type { DataCetak } from "./types";

// Identitas formulir mengikuti referensi kantor.
export const FORMAT_DOKUMEN: KopFormulir = {
  judul: "SK PERMINTAAN BARANG",
  kode: "PPIC",
  nomor: "010",
  revisi: "00",
  terbit: "08/25",
  divisi: "DPSA",
};

function buatDokumenBarangKeluar(data: DataCetak): string {
  const pengambil = [
    ...new Set(data.baris.map((b) => b.pic?.trim()).filter(Boolean)),
  ].join(", ");
  const tanggalJam = data.jam
    ? `${displayDate(data.tanggal)} / ${data.jam}`
    : displayDate(data.tanggal);
  // Formulir seperempat A4; identitas dan tanda tangan diulang jika material berlanjut.
  const halaman = lembarPerHalaman(data.baris, (isi, h) =>
    lembarFormulir(FORMAT_DOKUMEN, {
      halaman: h,
      informasi: `<table class="informasi">
        <colgroup><col style="width:18%" /><col style="width:2%" /><col style="width:32%" /><col style="width:15%" /><col style="width:2%" /><col style="width:12%" /><col style="width:8%" /><col style="width:11%" /></colgroup>
        <tbody>
          <tr><td class="label">ITEM PRODUKSI</td><td>:</td><td colspan="6">${escapeHtml(data.namaItem)}</td></tr>
          <tr><td class="label">PROYEK</td><td>:</td><td colspan="6">${escapeHtml(data.client)}</td></tr>
          <tr><td class="label">TGL / JAM</td><td>:</td><td>${escapeHtml(tanggalJam)}</td><td class="label">JML PROD</td><td>:</td><td>${escapeHtml(data.jumlahProduksi)}</td><td class="label">UNIT</td><td>${escapeHtml(data.unitProduksi)}</td></tr>
          <tr><td class="label">GRUP / TUKANG</td><td>:</td><td>${escapeHtml(pengambil)}</td><td class="label">${escapeHtml(data.referenceLabel ?? "NO. SPK")}</td><td>:</td><td colspan="3">${escapeHtml(data.spk)}</td></tr>
        </tbody>
      </table>`,
      material: tabelMaterial(
        [8, 32, 10, 10, 14, 26],
        isi
          .map((b, rowIndex) => `<tr>
        <td class="tengah">${h.awal + rowIndex + 1}</td>
        <td>${escapeHtml(b.name)}</td>
        <td class="tengah">${escapeHtml(b.unit)}</td>
        <td class="tengah">${escapeHtml(b.dokubah)}</td>
        <td class="tengah">${escapeHtml(b.qty)}</td>
        <td>${escapeHtml(b.keterangan)}</td>
      </tr>`)
          .join(""),
      ),
      keterangan: "Ket : Rangkap 3 (untuk Produksi, Gudang & Keuangan)",
      tandaTangan: ["TUKANG", "KA. PROD", "PPIC", "GUDANG"],
    }),
  );
  return dokumenFormulir(`${FORMAT_DOKUMEN.judul} - ${data.spk}`, halaman);
}

// Dokumen cetak terpisah agar menu, tombol, dan transaksi lain tidak ikut tercetak.
export function cetakBarangKeluar(data: DataCetak | DataCetak[]): Promise<void> {
  return cetakFormulir(
    (Array.isArray(data) ? data : [data]).map((transaksi) => buatDokumenBarangKeluar(transaksi)),
    "barang keluar",
  );
}

// Satu bentuk data cetak untuk cetak langsung, setelah edit, dan setelah simpan baru.
export function dataCetakDariTrx(trx: {
  recipientType: RecipientType;
  tanggal: string;
  client: string;
  spk: string;
  namaItem: string;
  baris: DataCetak["baris"];
}): DataCetak {
  return {
    tanggal: trx.tanggal,
    client: trx.client,
    spk: trx.spk,
    referenceLabel: trx.recipientType === "INTERNAL" ? "ID STOK/INTERNAL" : undefined,
    namaItem: trx.namaItem.trim(),
    baris: trx.baris,
  };
}

// Satuan barang tidak ikut di transaksi, jadi diambil per barang.
export async function muatSatuan(itemIds: number[]): Promise<Map<number, string>> {
  const materials = await Promise.all([...new Set(itemIds)].map((id) => getItem(id)));
  return new Map(materials.map((material) => [material.id, material.unit]));
}

// Cetak transaksi yang sudah tersimpan apa adanya.
export async function cetakTransaksi(transactions: OutboundRow[]): Promise<void> {
  const units = await muatSatuan(transactions.flatMap((trx) => trx.lines.map((line) => line.itemId)));
  await cetakBarangKeluar(transactions.map((trx) => dataCetakDariTrx({
    recipientType: trx.recipientType,
    tanggal: trx.date,
    client: trx.clientName,
    spk: trx.spk,
    namaItem: trx.itemName,
    baris: trx.lines.map((line) => ({
      name: line.itemName,
      code: line.itemCode,
      unit: units.get(line.itemId),
      qty: line.qty,
      pic: line.pic,
    })),
  })));
}
