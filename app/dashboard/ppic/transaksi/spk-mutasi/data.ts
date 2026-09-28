// Data sementara (dummy) SPK Internal & Mutasi Stok.

export type StatusBarang = "LOCKED" | "BUFFER";

export type SpkInternal = {
  id: number;
  noSpk: string;
  sku: string;
  namaBarang: string;
  periode: string;
  totalStock: number;
  stockBisaPakai: number;
  status: StatusBarang;
};

export const STATUS_BARANG: StatusBarang[] = ["LOCKED", "BUFFER"];

export const TUJUAN_PRODUKSI = ["Buffer Stock", "Pesanan SPK Klien"];

export const PENANGGUNG_JAWAB = ["Fauzi", "Andi", "Rina"];

export const dataSpkInternal: SpkInternal[] = [
  { id: 1, noSpk: "SPK-INT-2026-001", sku: "BRG-001", namaBarang: "Triplex 3mm", periode: "September 2026", totalStock: 60, stockBisaPakai: 20, status: "LOCKED" },
  { id: 2, noSpk: "SPK-INT-2026-002", sku: "BRG-002", namaBarang: "Cat Putih 5kg", periode: "September 2026", totalStock: 40, stockBisaPakai: 30, status: "BUFFER" },
];
