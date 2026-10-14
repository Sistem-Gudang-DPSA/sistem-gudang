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
  // Index of the purchase-request line this row comes from. Required whenever the request has a supplier mapping;
  // the BE answers null for POs made before mapping existed.
  lineIndex?: number | null;
}

// Editing replaces the lines wholesale; supplier, request and nomorPo cannot change (BE answers 400).
export type UpdatePurchaseOrderInput = Omit<CreatePurchaseOrderInput, "approvalRequestId" | "supplierId">;

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

export type PurchaseOrderStatus = "ISSUED" | "CANCELLED";

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
  status: PurchaseOrderStatus;
  cancelledAt: string | null;
  cancelledBy: number | null;
  cancelReason: string | null;
  barang: PurchaseOrderLineInput[];
}


// List rows carry the header only; the lines come from GET /purchase-orders/{id}.
export type PurchaseOrderRow = Omit<PurchaseOrder, "barang">;

// Supplier mapping of an APPROVED purchase request, made by Purchasing before POs are issued.
export type MappingStatus = "NOT_STARTED" | "PARTIAL" | "COMPLETE";

export interface MappingEntry {
  supplierId: number;
  supplierName: string;
  qty: number;
  purchaseOrderId: number | null;
  nomorPo: string | null;
}

export interface MappingLine {
  lineIndex: number;
  namaBarang: string;
  qty: number;
  satuan: string;
  proyek: string;
  noSpk: string;
  itemId?: number;
  mappedQty: number;
  remainingQty: number;
  mappings: MappingEntry[];
}

export interface PurchaseRequestMapping {
  approvalRequestId: number;
  status: MappingStatus;
  lines: MappingLine[];
}

// Only the lines sent are replaced; an empty suppliers list clears a line that has no PO yet.
export interface SaveMappingInput {
  lines: { lineIndex: number; suppliers: { supplierId: number; qty: number }[] }[];
}

export interface MappingSummary {
  notStarted: number;
  partial: number;
  completeNoPo: number;
  poIssued: number;
}
