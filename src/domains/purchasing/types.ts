export interface Supplier {
  id: number;
  code: string;
  name: string;
  bank: string;
  npwp: string;
  phone: string;
  pic?: string;
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
  supplierAddress?: string;
  supplierPhone?: string;
  supplierNpwp?: string;
  supplierBank?: string;
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
  // Index baris pada permintaan pembelian; dipakai backend untuk menandai baris yang sudah dipesan.
  lineIndex?: number;
  kodeBarang: string;
  namaBarang: string;
  satuan: string;
  jumlah: number;
  hargaSatuan: number;
  diskon: number;
}

// `noSpk` is stored by the backend from the approved request line. It is read-only in the FE.
export interface PurchaseOrderLine extends PurchaseOrderLineInput {
  // Database id of the line; inbound sends it as purchaseOrderLineId.
  id: number;
  itemId?: number | null;
  noSpk?: string | null;
  qtyReceived?: number;
  sisa?: number;
  receipts?: { inboundId: number; date: string; qtyArrived: number; statusQc: string | null; referenceNo: string | null; createdAt: string }[];
}

// Editing replaces the editable PO fields and lines. The original request,
// generated number and supplier are fixed; the PUT schema rejects supplierId.
export type UpdatePurchaseOrderInput = Omit<CreatePurchaseOrderInput, "approvalRequestId" | "supplierId">;

// nomorPo and every total are computed by the backend, so they are not part of the input.
export interface CreatePurchaseOrderInput {
  approvalRequestId?: number;
  tanggalPo: string;
  supplierId: number;
  picSupplier: string;
  barang: PurchaseOrderLineInput[];
  persenPpn: number;
  jasa: number;
}

export type PurchaseOrderStatus = "DRAFT" | "ISSUED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrder {
  id: number;
  nomorPo: string;
  approvalRequestId: number | null;
  tanggalPo: string;
  supplierId: number;
  supplierName: string;
  supplierAddress?: string;
  supplierPhone?: string;
  supplierNpwp?: string;
  supplierBank?: string;
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
  submittedAt?: string | null;
  submittedBy?: number | null;
  cancelledAt: string | null;
  cancelledBy: number | null;
  cancelReason: string | null;
  barang: PurchaseOrderLine[];
}

export interface PurchaseRequestMapping {
  approvalRequestId: number;
  status: "NOT_STARTED" | "PARTIAL" | "COMPLETE";
  lines: {
    lineIndex: number;
    namaBarang: string;
    qty: number;
    satuan: string;
    proyek: string;
    noSpk: string;
    itemId?: number;
    mappedQty: number;
    remainingQty: number;
    mappings: { supplierId: number; supplierName: string; qty: number; purchaseOrderId: number | null; nomorPo: string | null }[];
  }[];
}
