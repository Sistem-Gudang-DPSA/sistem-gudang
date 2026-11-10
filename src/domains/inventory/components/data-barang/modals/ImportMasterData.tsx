// Kolom Excel = kolom data barang; template import dan export memakai format yang sama agar hasil export bisa di-import ulang.
// Kategori, satuan, lokasi dan supplier dari Excel mengisi awal langkah mapping (ImportBarangMapping); yang tidak cocok dikosongkan di sana.
export type MasterDataImportRow = {
  code: string;
  name: string;
  detail: string;
  category: string;
  unit: string;
  locationCode: string;
  supplier: string;
  price: number;
  stock: number;
};

export const mstrDataTemplateHeaders = ['Kode Bawaan', 'Nama Barang', 'Keterangan Barang', 'Kategori', 'Satuan', 'Lokasi', 'Supplier', 'Harga', 'Stok'];
export const mstrDataTemplateExample = ['TH 039 AA', 'Light Green', 'TACO TH', '', '', '', '', 150000, 31.5];

const text = (v: unknown) => String(v ?? '').trim();
// Kosong dianggap 0; angka tidak valid atau negatif ditolak. Stok maks 2 desimal (kolom BE decimal(14,2)), harga bilangan bulat.
const amount = (v: unknown, label: string, rowNumber: number, decimals: 0 | 2) => {
  const n = v === '' || v == null ? 0 : Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Baris ${rowNumber}: ${label} tidak valid`);
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
};

export function MasterData(r: Record<string, unknown>, rowNumber: number): MasterDataImportRow {
  const name = text(r['Nama Barang']);
  if (!name) throw new Error(`Baris ${rowNumber}: Nama Barang wajib diisi`);
  return {
    code: text(r['Kode Bawaan']),
    name,
    detail: text(r['Keterangan Barang']),
    category: text(r['Kategori']),
    unit: text(r['Satuan']),
    locationCode: text(r['Lokasi']),
    supplier: text(r['Supplier']),
    price: amount(r['Harga'], 'Harga', rowNumber, 0),
    stock: amount(r['Stok'], 'Stok', rowNumber, 2),
  };
}
