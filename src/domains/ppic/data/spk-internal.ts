export type StatusBarang = 'LOCKED' | 'BUFFER';

export type SpkInternal = {
  id: number;
  noSpk: string;
  sku: string;
  namaBarang: string;
  periode: string;
  totalStock: number;
  totalBisaPakai: number;
  status: StatusBarang;
};

export const spk_internal_path = '/dashboard/ppic/transaksi/spk-mutasi-internal';

export const alokasiBarangPath = (id: number | string) => `${spk_internal_path}/alokasi-barang/${id}`;

// Data dummy sementara (belum terhubung ke API), disimpan di memori modul supaya halaman list dan
// Alokasikan Barang memakai data yang sama. Data kembali ke awal saat halaman di-refresh.
let spkInternalList: SpkInternal[] = [
  { id: 1, noSpk: 'SPK-INT/2026/001', sku: 'BRG-001', namaBarang: 'Besi Hollow 4x4', periode: 'Oktober 2026', totalStock: 40, totalBisaPakai: 0, status: 'LOCKED' },
  { id: 2, noSpk: 'SPK-INT/2026/002', sku: 'BRG-002', namaBarang: 'Plat Aluminium 2mm', periode: 'Oktober 2026', totalStock: 100, totalBisaPakai: 50, status: 'BUFFER' },
];

export const getSpkInternalList = () => spkInternalList;

// Stok yang dikaitkan ke SPK klien tidak lagi bebas dipakai; kalau stock bebas habis, statusnya jadi LOCKED
export const alokasikanStock = (id: number, jumlah: number) => {
  spkInternalList = spkInternalList.map((item) => {
    if (item.id !== id) return item;
    const totalBisaPakai = item.totalBisaPakai - jumlah;
    return { ...item, totalBisaPakai, status: totalBisaPakai === 0 ? 'LOCKED' : item.status };
  });
};
