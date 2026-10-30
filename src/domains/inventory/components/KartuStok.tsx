export type MutasiTipe = 'MASUK' | 'KELUAR' | 'PENYESUAIAN';

export type KartuEntry = {
  id: string;
  date: string;
  createdAt: string;
  type: MutasiTipe;
  client: string | null;   
  spk: string | null;      
  project: string | null;
  usage: string;
  qtyIn: number;
  qtyOut: number;
  note: string | null;
};

export type KartuStokData = {
  item: { id: number; code: string | null; name: string; unit: string; stock: number };
  openingBalance: number; // saldo sebelum mutasi pertama
  entries: KartuEntry[];
};

export type KartuRow = KartuEntry & { saldo: number };

export function buildKartu(data: KartuStokData) {
  const sorted = [...data.entries].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  let saldo = data.openingBalance;
  const rows: KartuRow[] = sorted.map((e) => {
    saldo += e.qtyIn - e.qtyOut;
    return { ...e, saldo };
  });
  return { rows, saldoAkhir: saldo, totalIn: rows.reduce((s, r) => s + r.qtyIn, 0), totalOut: rows.reduce((s, r) => s + r.qtyOut, 0) };
}

// Sesuaikan dengan route Anda
export const kartuStokPath = (itemId: number) => `/dashboard/gudang/laporan/kartu-stok/${itemId}`;