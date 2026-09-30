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

export interface CreateInboundReturnInput {
  itemId: number;
  date: string;
  qty: number;
  clientName?: string;
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
  summary: { total: number; supplier: number; produksi: number; klien: number };
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
  clientName: string;
  spk: string;
  itemName: string;
  warehouseType: WarehouseType;
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
