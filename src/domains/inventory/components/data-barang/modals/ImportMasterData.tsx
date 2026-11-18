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
// Batas API: stok maks 1.000.000 (3 desimal), harga maks 2.000.000.000 (bulat), maks 1.000 baris per import.
export const MAX_IMPORT_ROWS = 1000;
const MAX_STOCK = 1_000_000;
const MAX_PRICE = 2_000_000_000;
// Kosong dianggap 0; angka tidak valid, negatif, melebihi batas, atau kelebihan desimal ditolak (tidak dibulatkan diam-diam).
const amount = (v: unknown, label: string, rowNumber: number, decimals: 0 | 3, max: number) => {
  const n = v === '' || v == null ? 0 : Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`Baris ${rowNumber}: ${label} tidak valid`);
  const f = 10 ** decimals;
  if (Math.abs(n * f - Math.round(n * f)) > 1e-6)
    throw new Error(`Baris ${rowNumber}: ${label} maksimal ${decimals === 0 ? 'bilangan bulat' : `${decimals} desimal`}`);
  if (n > max) throw new Error(`Baris ${rowNumber}: ${label} maksimal ${max.toLocaleString('id-ID')}`);
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
    price: amount(r['Harga'], 'Harga', rowNumber, 0, MAX_PRICE),
    stock: amount(r['Stok'], 'Stok', rowNumber, 3, MAX_STOCK),
  };
}
