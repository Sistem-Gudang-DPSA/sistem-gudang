export interface Supplier {
  id: number;
  code: string;
  name: string;
  bank: string;
  npwp: string;
  phone: string;
  address: string;
}

export type CreateSupplierInput = Omit<Supplier, "id">;
