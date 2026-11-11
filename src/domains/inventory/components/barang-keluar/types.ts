import type { OutboundRow, RecipientType } from "@/domains/inventory/types";

// Satu baris barang hasil scan. SPK dan Nama Produk/Proyek diisi sekali di atas untuk seluruh transaksi.
// Baris input manual dibuat kosong (itemId null) sampai materialnya dipilih dari dropdown.
export type BarisForm = {
  key: string;
  manual: boolean;
  itemId: number | null;
  code: string;
  name: string;
  unit: string;
  stock: number;
  qty: string;
  dokubah: string;
};

export type ModeKeluar = "spk" | "stok";

export type FormBarangKeluar = {
  namaPengambil: string;
  client: string;
  stockId: string;
  tanggal: string;
  spk: string;
  namaItem: string;
  recipientType: RecipientType;
  baris: BarisForm[];
};

export type EditTarget = { trx: OutboundRow; lineIndex: number };
export type EditLineForm = {
  itemId: string;
  picked?: { name: string; code: string | null; unit?: string };
  qty: string;
};
export type EditForm = { tanggal: string; spk: string; namaItem: string; lines: EditLineForm[] };

export type DataCetak = {
  tanggal: string;
  jam?: string;
  client: string;
  spk: string;
  namaItem: string;
  referenceLabel?: string;
  jumlahProduksi?: string | number;
  unitProduksi?: string;
  baris: {
    name: string;
    code: string | null | undefined;
    unit?: string;
    dokubah?: string | number;
    keterangan?: string;
    qty: number;
    pic: string | null | undefined;
  }[];
};
