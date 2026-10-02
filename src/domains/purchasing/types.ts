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

export interface PurchaseOrderLineInput {
  kodeBarang: string;
  namaBarang: string;
  satuan: string;
  jumlah: number;
  hargaSatuan: number;
  diskon: number;
}

// nomorPo and every total are computed by the backend, so they are not part of the input.
export interface CreatePurchaseOrderInput {
  approvalRequestId: number;
  tanggalPo: string;
  supplierId: number;
  picSupplier: string;
  barang: PurchaseOrderLineInput[];
  persenPpn: number;
  jasa: number;
}

export interface PurchaseOrder {
  id: number;
  nomorPo: string;
  approvalRequestId: number;
  tanggalPo: string;
  supplierId: number;
  supplierName: string;
  picSupplier: string;
  dppLain: number;
  persenPpn: number;
  jasa: number;
  subtotal: number;
  nilaiPpn: number;
  grandTotal: number;
  createdBy: number;
  createdAt: string;
  barang: PurchaseOrderLineInput[];
}

