export type BarisBarangMasuk = {
  key: string;
  manual: boolean;
  itemId: number | null;
  code: string | null;
  name: string;
  unit: string;
  supplierId: number | null;
  qtyArrived: string;
  qtyPurchased: string;
};

export type SupplierTerpilih = { id: number; name: string };
