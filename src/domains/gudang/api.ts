import { apiClient, toQuery } from "@/shared/lib/api-client";
import type { BarangMasukItems, LaporanBarangMasukFilter } from "./types";
import type { BarangKeluarItems, LaporanBarangKeluarFilter } from "./types";
import type { PaginatedResult } from "@/domains/inventory/types";

export function getLaporanBarangMasuk(params?: LaporanBarangMasukFilter) {
  return apiClient.get<PaginatedResult<BarangMasukItems> | BarangMasukItems[]>(
    `/api/v1/gudang/laporan/barang-masuk${toQuery(params)}`
  );
}

export function getLaporanBarangKeluar(params?: LaporanBarangMasukFilter) {
  return apiClient.get<PaginatedResult<BarangKeluarItems> | BarangKeluarItems[]>(
    `/api/v1/gudang/laporan/barang-keluar${toQuery(params)}`
  );
}