
import { getOutboundUsage, listItems, listOutbound } from '@/domains/inventory/api';
import type { ItemListRow } from '@/domains/inventory/types';
import { fetchAllPages } from '@/shared/lib/fetch-all';
import { getTrackingSpk } from '@/domains/ppic/api';

// Informasi sumber data realisasi
export const SUMBER_DATA_NOTICE =
  'Data realisasi dihitung dari transaksi Barang Keluar (jumlah x harga barang saat ini). Anggaran, sisa, dan status akan tersedia setelah data dokubah PPIC digunakan.';

export const realisasiSpkPath =
  '/dashboard/keuangan/laporan/realisasi-spk';

export const realisasiSpkDetailPath = (noSpk: string) =>
  `${realisasiSpkPath}/${encodeURIComponent(noSpk)}`;

export type ItemSpk = {
  name: string;
  qty: number;
  unit: string;
};

export type StatusRealisasi = 'Untung' | 'Rugi';

export const statusRealisasi = (
  anggaran: number,
  realisasi: number,
): StatusRealisasi =>
  anggaran - realisasi < 0 ? 'Rugi' : 'Untung';

export type RealisasiListRow = {
  id: string;
  noSpk: string;
  client: string;
  anggaran: number | null;
  realisasi: number;
  sisa: number | null;
  status: StatusRealisasi | null;
};

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April',
  'Mei', 'Juni', 'Juli', 'Agustus',
  'September', 'Oktober', 'November', 'Desember',
];

export function periodeLabel(
  day: string,
  month: string,
  year: string,
) {
  const parts = [
    day ? String(Number(day)) : '',
    month ? BULAN[Number(month) - 1] : '',
    year,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' ') : 'Semua periode';
}

// Mengambil seluruh master barang
export const loadAllItems = () =>
  fetchAllPages((page, pageSize) =>
    listItems({ page, pageSize }),
  );

// Mengambil rekap realisasi seluruh SPK
export async function loadRealisasiList(
  range: { startDate?: string; endDate?: string },
): Promise<RealisasiListRow[]> {
  const [usage, items] = await Promise.all([
    getOutboundUsage(range),
    loadAllItems(),
  ]);

  const harga = new Map(
    items.map((item) => [item.id, item.price ?? 0]),
  );

  const bySpk = new Map<string, RealisasiListRow>();

  for (const u of usage) {
    const row = bySpk.get(u.spk) ?? {
      id: u.spk,
      noSpk: u.spk,
      client: u.clientName,
      anggaran: null,
      realisasi: 0,
      sisa: null,
      status: null,
    };

    row.realisasi +=
      u.qty * (harga.get(u.itemId) ?? 0);

    bySpk.set(u.spk, row);
  }

  return [...bySpk.values()];
}

// Mengambil daftar item produksi dari tracking SPK
export async function loadItemSpk(
  noSpk: string,
): Promise<ItemSpk[]> {
  const cleanSpk = decodeURIComponent(noSpk ?? '').trim();
  const tracking = await getTrackingSpk(cleanSpk);

  const unik = new Map<string, ItemSpk>();

  for (const product of tracking.products) {
    if (!unik.has(product.name)) {
      unik.set(product.name, {
        name: product.name,
        qty: product.qty,
        unit: product.unit,
      });
    }
  }

  return [...unik.values()];
}

// Tipe baris rincian material
export type RincianRow = {
  kode: string;
  nama: string;
  satuan: string;
  kuota: number;
  qty: number;
  harga: number;
  biaya: number;
};

export type RincianSpk = {
  id: string;
  noSpk: string;
  client: string;
  anggaran: number | null;
  rows: RincianRow[];
  totalBiaya: number;
};

// Mengambil transaksi barang keluar dan mengelompokkan berdasarkan item produksi
export async function loadRincianPerItem(
  noSpk: string,
  items: ItemListRow[],
): Promise<Map<string, RincianRow[]>> {
  const cleanSpk = decodeURIComponent(noSpk ?? '').trim();
  const byId = new Map(
    items.map((item) => [item.id, item]),
  );

  // Mengambil seluruh halaman transaksi barang keluar
  const transactions = await fetchAllPages(
    (page, pageSize) =>
      listOutbound({
        page,
        pageSize,
        search: cleanSpk,
      }),
  );

  // Struktur:
  // item produksi -> ID material -> rincian material
  const perItem = new Map<
    string,
    Map<number, RincianRow>
  >();

  for (const trx of transactions) {
    // Pastikan nomor SPK benar-benar sama (case-insensitive & decode)
    const trxSpk = decodeURIComponent(trx.spk ?? '').trim().toLowerCase();
    if (trxSpk !== cleanSpk.toLowerCase()) continue;

    const namaItem = trx.itemName?.trim().toLowerCase();

    const grup =
      perItem.get(namaItem) ?? new Map<number, RincianRow>();

    for (const line of trx.lines) {
      const item = byId.get(line.itemId);
      const harga = item?.price ?? 0;

      const row = grup.get(line.itemId) ?? {
        kode: line.itemCode ?? item?.code ?? '-',
        nama: line.itemName ?? item?.name ?? `Barang #${line.itemId}`,
        satuan: item?.unit ?? '-',
        kuota: 0,
        qty: 0,
        harga,
        biaya: 0,
      };

      // Akumulasi jumlah material yang keluar
      row.qty += line.qty;

      // Hitung biaya berdasarkan harga barang
      row.biaya = row.qty * harga;

      grup.set(line.itemId, row);
    }

    perItem.set(namaItem, grup);

  }

  

  return new Map(
    [...perItem].map(([nama, grup]) => [
      nama,
      [...grup.values()],
    ]),
  );
}

// Mengambil rincian keseluruhan material dalam satu SPK
export async function loadRincianSpk(
  noSpk: string,
  items: ItemListRow[],
): Promise<RincianSpk> {
  const cleanSpk = decodeURIComponent(noSpk ?? '').trim();
  const usage = await getOutboundUsage({
    spk: [cleanSpk],
  });

  const byId = new Map(
    items.map((item) => [item.id, item]),
  );

  const rows: RincianRow[] = usage.map((u) => {
    const item = byId.get(u.itemId);
    const harga = item?.price ?? 0;

    return {
      kode: item?.code || '-',
      nama: item?.name ?? `Barang #${u.itemId}`,
      satuan: item?.unit ?? '-',
      kuota: 0,
      qty: u.qty,
      harga,
      biaya: u.qty * harga,
    };
  });

  return {
    id: noSpk,
    noSpk,
    client: usage[0]?.clientName ?? '-',
    anggaran: null,
    rows,
    totalBiaya: rows.reduce(
      (total, row) => total + row.biaya,
      0,
    ),
  };
}
