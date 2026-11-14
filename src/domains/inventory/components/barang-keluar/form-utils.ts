import type { CreateOutboundInput, RecipientType } from "@/domains/inventory/types";
import { todayIso } from "@/domains/inventory/date";
import { randomId } from "@/shared/lib/random-id";
import type { BarisForm, FormBarangKeluar, ModeKeluar } from "./types";

export const MAX_JUMLAH = 999_999_999;
export const JUMLAH_INPUT = { type: "text", inputMode: "decimal", autoComplete: "off" } as const;
export const inputJumlah = (value: string) => value.replace(/,/g, ".");
export const jumlahValid = (value: string) =>
  /^(?:\d{1,9}(?:\.\d{1,3})?|\.\d{1,3})$/.test(value) &&
  Number(value) > 0 && Number(value) <= MAX_JUMLAH;

// Pertahankan input yang salah agar pengguna dapat melihat dan memperbaikinya.
export function peringatanJumlah(value: string): string {
  if (!value) return "Jumlah pengambilan wajib diisi.";
  if (/[^\d.]/.test(value)) return "Gunakan angka saja, dengan koma untuk desimal.";
  if (!jumlahValid(value))
    return "Masukkan jumlah lebih dari 0, ";
  return "";
}

export const barisManual = (): BarisForm => ({
  key: randomId(),
  manual: true,
  itemId: null,
  code: "",
  name: "",
  unit: "",
  stock: 0,
  qty: "1",
  dokubah: "",
});

export const formKosong = (): FormBarangKeluar => ({
  namaPengambil: "",
  client: "",
  stockId: "",
  tanggal: todayIso(),
  spk: "",
  namaItem: "",
  // Form tidak punya pilihan penerima lagi, sedangkan API mewajibkannya; barang keluar gudang diambil untuk produksi
  recipientType: "PRODUKSI",
  baris: [],
});

export const tambahSatu = (baris: BarisForm[], key: string) =>
  baris.map((b) =>
    b.key === key
      ? { ...b, qty: String(Math.min((Number(b.qty) || 0) + 1, MAX_JUMLAH)) }
      : b,
  );

// Baris manual yang materialnya belum dipilih diabaikan.
export const barisTerisi = (baris: BarisForm[]) => baris.filter((b) => b.itemId !== null);

// Pesan kesalahan pertama pada form sebelum preview, atau "" bila lengkap.
// spkAda/produkAda: SPK dan item yang dipilih memang ada di pilihan dari tracking (hanya untuk mode SPK).
export function validasiForm(
  form: FormBarangKeluar,
  mode: ModeKeluar,
  { spkAda, produkAda }: { spkAda: boolean; produkAda: boolean },
): string {
  const { namaPengambil, tanggal, client, spk, stockId, namaItem, baris } = form;
  if (mode === "stok") {
    if (!tanggal || !stockId.trim() || !namaPengambil.trim() || !namaItem.trim())
      return "Lengkapi tanggal, ID stok/internal, nama pengambil, dan nama item.";
  } else {
    if (!tanggal || !client || !spk || !namaPengambil.trim() || !namaItem.trim())
      return "Lengkapi tanggal, client, SPK, nama pengambil, dan nama produk/proyek.";
    if (!spkAda || !produkAda)
      return "Pilih SPK milik client dan item yang tersedia pada SPK tersebut.";
  }
  const terisi = barisTerisi(baris);
  if (terisi.length === 0) return "Scan atau pilih minimal satu barang yang keluar.";
  if (terisi.some((b) => !jumlahValid(b.qty)))
    return "Jumlah pengambilan harus lebih dari 0, maksimal 999999999, dengan maksimal 3 angka di belakang koma.";
  if (new Set(terisi.map((b) => b.itemId)).size !== terisi.length)
    return "Material yang sama cukup diisi pada satu baris. Tambahkan jumlahnya di baris tersebut.";
  const melebihiStok = terisi.find((b) => Number(b.qty) > b.stock);
  if (melebihiStok)
    return `Jumlah ${melebihiStok.name} melebihi stok ${melebihiStok.stock} ${melebihiStok.unit}.`;
  return "";
}

// Isi permintaan simpan, plus client untuk dokumen cetak.
export function susunInput(form: FormBarangKeluar, mode: ModeKeluar) {
  const internal = mode === "stok";
  const spk = internal ? form.stockId.trim() : form.spk;
  const pengambil = form.namaPengambil.trim();
  const recipientType: RecipientType = internal ? "INTERNAL" : form.recipientType;
  const terisi = barisTerisi(form.baris);
  const input: CreateOutboundInput = {
    date: form.tanggal,
    spk,
    itemName: form.namaItem.trim(),
    recipientType,
    notes: `Pengambil: ${pengambil}`,
    lines: terisi.map((b) => ({ itemId: b.itemId as number, qty: Number(b.qty), pic: pengambil })),
  };
  return { input, terisi, pengambil, client: internal ? "Internal" : form.client };
}
