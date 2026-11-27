// Satu baris form mengacu ke satu baris PO yang sudah disubmit. Supplier, harga
// dan SPK dibaca dari PO, bukan dipilih ulang oleh Gudang.
export type BarisBarangMasuk = {
  key: string;
  manual: boolean;
  itemId: number | null;
  code: string | null;
  name: string;
  unit: string;
  purchaseOrderId: number;
  purchaseOrderLineId: number;
  poNumber: string;
  supplierName: string;
  noSpk: string | null;
  qtyPurchased: string;
  sisa: number;
  qtyArrived: string;
};

export type PoTerpilih = {
  id: number;
  nomorPo: string;
  supplierName: string;
};
