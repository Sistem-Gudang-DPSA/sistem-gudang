export interface Item {
  id: number;
  code: string | null;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  locationId: number | null;
  supplierId: number;
  createdAt: string | null;
  updatedAt: string | null;
}

// Row shape of GET /items (list): joined with location and supplier, no timestamps.
export type ItemListRow = Omit<Item, "createdAt" | "updatedAt"> & {
  locationCode: string | null;
  supplierName: string;
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
}

export interface CreateLocationInput {
  code: string;
  rackName: string;
  rackNumber: string;
}

export interface PaginatedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}
