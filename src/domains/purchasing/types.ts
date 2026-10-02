export interface Supplier {
  id: number;
  code: string;
  name: string;
  bank: string;
  npwp: string;
  phone: string;
  address: string;
  pajak: Pajak;
}

export type Pajak = "PKP" | "NON_PKP";

export type CreateSupplierInput = Omit<Supplier, "id">;

export interface SupplierPriceRow {
  itemId: number;
  kode: string | null;
  nama: string;
  satuan: string;
  kategori: string;
  // 12 entries, January to December; null means no price entered.
  harga: (number | null)[];
  rataRata: number | null;
}

export interface SupplierPrices {
  supplierId: number;
  supplierName: string;
  pajak: Pajak;
  tahun: number;
  rows: SupplierPriceRow[];
}

export interface SupplierPriceChange {
  itemId: number;
  bulan: number;
  harga: number | null;
}
