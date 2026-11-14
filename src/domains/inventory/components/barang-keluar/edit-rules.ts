import type { OutboundRow } from "@/domains/inventory/types";
import type { EditForm } from "./types";
import { jumlahValid } from "./form-utils";

// Batas waktu berlaku untuk pengajuan, persetujuan tetap dapat dipakai setelahnya.
export const BATAS_EDIT_MS = 24 * 60 * 60 * 1000;
export const PESAN_TIDAK_BISA_EDIT =
  "Ajukan edit ke superadmin dan tunggu persetujuan. Setiap transaksi hanya dapat diedit satu kali.";
export const batasEdit = (trx: OutboundRow) => new Date(trx.createdAt).getTime() + BATAS_EDIT_MS;
export const bisaEdit = (trx: OutboundRow, userId?: number) =>
  trx.editRequest?.status === "APPROVED" &&
  (userId === undefined || trx.editRequest.requestedBy === userId);

// Server menyimpan createdAt dalam UTC; waktu kerja gudang adalah WIB.
const FORMAT_WAKTU = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export const tampilWaktu = (ms: number) => {
  const part = Object.fromEntries(FORMAT_WAKTU.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return `${part.day}-${part.month}-${part.year} ${part.hour}:${part.minute}`;
};

// Pesan kesalahan pertama pada form edit, atau "" bila lengkap.
export function validasiEdit({ tanggal, spk, namaItem, lines }: EditForm): string {
  if (
    !tanggal ||
    !spk.trim() ||
    !namaItem.trim() ||
    lines.some((line) => !Number.isSafeInteger(Number(line.itemId)) || Number(line.itemId) <= 0 || !jumlahValid(line.qty))
  )
    return "Isi tanggal, SPK, nama item/projek, nama barang, dan jumlah lebih dari 0, maksimal 999999999, dengan paling banyak 2 angka desimal.";
  if (new Set(lines.map((line) => line.itemId)).size !== lines.length)
    return "Barang ini sudah ada pada baris lain di transaksi yang sama.";
  return "";
}
