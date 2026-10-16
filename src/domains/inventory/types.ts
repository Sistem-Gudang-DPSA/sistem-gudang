export interface Item {
  id: number;
  code: string | null;
  name: string;
  detail?: string | null;
  category: string;
  unit: string;
  price: number;
  stock: number;
  locationId: number | null;
  supplierId: number | null;
  // Path relatif foto barang (dilayani lewat fileUrl); null bila belum ada foto.
  photo?: { thumb: string; display: string } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Row shape of GET /items (list): joined with location and supplier, no timestamps.
export type ItemListRow = Omit<Item, "createdAt" | "updatedAt"> & {
  locationCode: string | null;
  supplierName: string | null;
};

export interface CreateItemInput {
  name: string;
  category: string;
  unit: string;
  price: number;
  supplierId: number;
}

export interface Location {
  id: number;
  code: string;
  rackName: string;
  rackNumber: string;
  description?: string | null;
}

export interface CreateLocationInput {
  code: string;
  rackName: string;
  rackNumber: string;
  description?: string | null;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Server-side ordering; the BE accepts only whitelisted columns per list.
export interface SortParams {
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

// Filters of GET /items; "none" means items that have no supplier / location yet.
export interface ItemFilterParams {
  category?: string;
  unit?: string;
  supplierId?: number | "none";
  locationId?: number | "none";
  stock?: "empty";
}

export interface UpdateItemInput {
  name?: string;
  detail?: string | null;
  category?: string;
  unit?: string;
  price?: number;
  supplierId?: number | null;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

// Transactions, stock opname and material requests of the Gudang (warehouse) division.
export type InboundSource = "SUPPLIER" | "PRODUKSI" | "KLIEN";
export type StatusQc = "PASS" | "PARTIAL_RETUR";

export interface InboundRow {
  id: number;
  date: string;
  itemId: number;
  itemCode: string | null;
  itemName: string;
  locationCode: string | null;
  supplierId: number | null;
  supplierName: string | null;
  source: InboundSource;
  qtyArrived: number;
  qtyPurchased: number | null;
  statusQc: StatusQc | null;
  referenceNo: string | null;
  supplierDeliveryNo: string | null;
  clientName: string | null;
  spk: string | null;
  notes: string | null;
  createdBy: number;
  createdAt: string;
}

export interface InboundListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  source?: InboundSource;
}

export interface CreateInboundInput {
  itemId: number;
  date: string;
  source?: "SUPPLIER" | "PRODUKSI";
  supplierId?: number;
  qtyArrived: number;
  qtyPurchased?: number;
  statusQc: StatusQc;
  referenceNo?: string;
  supplierDeliveryNo?: string;
  notes?: string;
}

export interface InboundBatchLine {
  itemId: number;
  qtyArrived: number;
  statusQc: StatusQc;
  qtyPurchased?: number;
}

export interface CreateInboundBatchInput {
  date: string;
  source?: "SUPPLIER" | "PRODUKSI";
  notes?: string;
  lines: InboundBatchLine[];
}

export interface CreateInboundReturnInput {
  itemId: number;
  date: string;
  qty: number;
  spk?: string;
  referenceNo?: string;
  notes?: string;
}

export interface InboundReportParams extends Omit<InboundListParams, "search"> {
  q?: string;
}

export interface InboundReport {
  rows: InboundRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: { total: number; supplier: number; produksi: number; klien: number; qtyTotal: number; qtySupplier: number; qtyProduksi: number; qtyKlien: number };
}

export type WarehouseType = "BAHAN_BAKU" | "WIP" | "BARANG_JADI";
export type RecipientType = "PRODUKSI" | "KLIEN";

export interface OutboundLine {
  itemId: number;
  itemCode: string | null;
  itemName: string;
  locationCode: string | null;
  qty: number;
  pic: string;
}

export interface OutboundRow {
  id: number;
  date: string;
  clientName: string;
  spk: string;
  itemName: string;
  warehouseType: WarehouseType;
  recipientType: RecipientType;
  notes: string | null;
  createdBy: number;
  createdAt: string;
  lines: OutboundLine[];
}

export interface OutboundListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  warehouseType?: WarehouseType;
  recipientType?: RecipientType;
}

export interface CreateOutboundInput {
  date: string;
  spk: string;
  itemName: string;
  // Defaults to BAHAN_BAKU on the API; WIP and Barang Jadi are not handled by the FE yet.
  warehouseType?: WarehouseType;
  recipientType: RecipientType;
  notes?: string;
  lines: { itemId: number; qty: number; pic: string }[];
}

export interface OutboundReportParams extends Omit<OutboundListParams, "search"> {
  q?: string;
}

export interface OutboundReport {
  rows: OutboundRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: { bahanBaku: number; wip: number; barangJadi: number };
}

export interface StockOpnameRow {
  id: number;
  month: number;
  year: number;
  notes: string | null;
  createdBy: number;
  createdAt: string;
  lineCount: number;
}

export interface StockOpnameLine {
  itemId: number;
  itemCode: string | null;
  itemName: string;
  category: string;
  unit: string;
  systemQty: number;
  physicalQty: number;
  difference: number;
  systemPrice: number;
  physicalPrice: number;
  note: string | null;
}

export interface StockOpnameDetail extends Omit<StockOpnameRow, "lineCount"> {
  lines: StockOpnameLine[];
}

export interface StockOpnameListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  month?: number;
  year?: number;
}

export interface CreateStockOpnameInput {
  month: number;
  year: number;
  notes?: string;
  lines: { itemId: number; physicalQty: number; note?: string }[];
}

export type MaterialRequestStatus = "PENDING" | "PROSES" | "SELESAI";

export interface MaterialRequestRow {
  id: number;
  requestDate: string;
  spk: string;
  clientName: string;
  productionItem: string;
  toolGroup: string;
  status: MaterialRequestStatus;
  notes: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  lineCount: number;
}

export interface MaterialRequestLine {
  itemId: number;
  itemCode: string | null;
  itemName: string;
  unit: string;
  locationCode: string | null;
  qty: number;
}

export interface MaterialRequestDetail extends Omit<MaterialRequestRow, "lineCount"> {
  lines: MaterialRequestLine[];
}

export interface RequestReportParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: MaterialRequestStatus;
  startDate?: string;
  endDate?: string;
}

export interface RequestReport {
  rows: MaterialRequestRow[];
  total: number;
  page: number;
  pageSize: number;
}
export interface RekapPermintaan {
  id: string | number;
  tanggal: string;
  noSPK: string;
  namaKlien: string;
  itemProduksi: string;
  grupTukang: string; 
}

export interface RekapPermintaanItems {
  id: string | number;
  kepalaTukang: string;
  noSPK: string;
  itemPekerjaan: string;
  namaProyek: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  itemBahan: string;
  jumlahPermintaan: number;
  sisaKuotaDokubah: number;
}
