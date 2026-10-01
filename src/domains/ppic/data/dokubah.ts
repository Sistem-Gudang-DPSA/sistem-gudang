export type StatusDokubah = 'Draft' | 'Pending' | 'Approved' | 'Rejected';

export interface BahanDokubah {
  kodeBarang: string;
  namaBahan: string;
  satuan: string;
  hargaSatuan: number;
  kuota: number;
  realisasi: number;
  keterangan: string;
}

export interface DokubahItem {
  id: number;
  noSpk: string;
  client: string;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalSelesai: string; // YYYY-MM-DD
  status: StatusDokubah;
  penanggungJawab?: string;
  fileDokubah?: string;
  totalAnggaran: number;
  bahan: BahanDokubah[];
}

export const dokubah_path = '/dashboard/ppic/transaksi/dokubah';

export const  buat_dokubah_path= `${dokubah_path}/buat-dokubah`;

export const viewDokubahPath = (id: number | string) => `${dokubah_path}/view-dokubah/${id}`;

export const editMaterialPath = (id: number | string) => `${dokubah_path}/edit-material/${id}`;

export const rekap_dokubah_path = '/dashboard/ppic/laporan/rekap-dokubah';

export const detailRekapDokubahPath = (id: number | string) => `${rekap_dokubah_path}/detail-rekap-dokubah/${id}`;

// Belum ada API: daftar disimpan di memori modul supaya halaman list dan View memakai data yang sama.
// Data kembali ke awal saat halaman di-refresh.
let dokubahList: DokubahItem[] = [
  {
    id: 1,
    noSpk: 'SPK-2026-001',
    client: 'PT Bintang Raya',
    tanggalMulai: '2026-09-01',
    tanggalSelesai: '2026-09-15',
    status: 'Approved',
    penanggungJawab: 'Budi Santoso',
    fileDokubah: 'dokubah-spk-001.pdf',
    totalAnggaran: 150_000_000,
    bahan: [
      { kodeBarang: 'BRG-001', namaBahan: "Plat Besi SS400 6mm x 4' x 8'", satuan: 'lembar', hargaSatuan: 1_850_000, kuota: 40, realisasi: 28, keterangan: 'Untuk rangka utama' },
      { kodeBarang: 'BRG-002', namaBahan: 'Besi Siku 50x50x5mm - 6m', satuan: 'batang', hargaSatuan: 320_000, kuota: 60, realisasi: 60, keterangan: '' },
      { kodeBarang: 'BRG-003', namaBahan: 'Kawat Las RB-26 2.6mm', satuan: 'kg', hargaSatuan: 32_000, kuota: 100, realisasi: 45, keterangan: '' },
      { kodeBarang: 'BRG-004', namaBahan: 'Cat Epoxy Primer Abu-abu 20L', satuan: 'pail', hargaSatuan: 1_250_000, kuota: 10, realisasi: 4, keterangan: 'Lapisan dasar sebelum finishing' },
    ],
  },
  {
    id: 2,
    noSpk: 'SPK-2026-002',
    client: 'CV Indo Makmur',
    tanggalMulai: '2026-09-10',
    tanggalSelesai: '2026-09-30',
    status: 'Pending',
    penanggungJawab: 'Siti Rahmawati',
    totalAnggaran: 85_000_000,
    bahan: [
      { kodeBarang: 'BRG-005', namaBahan: 'Pipa Hitam SCH40 2" - 6m', satuan: 'batang', hargaSatuan: 780_000, kuota: 30, realisasi: 0, keterangan: '' },
      { kodeBarang: 'BRG-006', namaBahan: 'Elbow 90° 2" SCH40', satuan: 'pcs', hargaSatuan: 45_000, kuota: 50, realisasi: 0, keterangan: '' },
      { kodeBarang: 'BRG-003', namaBahan: 'Kawat Las RB-26 2.6mm', satuan: 'kg', hargaSatuan: 32_000, kuota: 40, realisasi: 0, keterangan: '' },
    ],
  },
  {
    id: 3,
    noSpk: 'SPK-2026-003',
    client: 'Global Mas',
    tanggalMulai: '2026-09-18',
    tanggalSelesai: '2026-10-05',
    status: 'Rejected',
    penanggungJawab: 'Andi Wijaya',
    totalAnggaran: 42_000_000,
    bahan: [
      { kodeBarang: 'BRG-007', namaBahan: "Plat Aluminium 3mm x 4' x 8'", satuan: 'lembar', hargaSatuan: 1_400_000, kuota: 20, realisasi: 0, keterangan: '' },
      { kodeBarang: 'BRG-008', namaBahan: 'Baut & Mur M12x50 Galvanis', satuan: 'pcs', hargaSatuan: 3_500, kuota: 500, realisasi: 0, keterangan: 'Cadangan 5%' },
    ],
  },
];

export const getDokubahList = () => dokubahList;

export const addDokubah = (item: DokubahItem) => {
  dokubahList = [...dokubahList, item];
};

export const updateBahanDokubah = (id: number, bahan: BahanDokubah[]) => {
  dokubahList = dokubahList.map((item) => (item.id === id ? { ...item, bahan } : item));
};

// YYYY-MM-DD -> DD/MM/YYYY tanpa lewat Date, supaya tidak bergeser karena timezone
export const formatTanggal = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const angkaFormatter = new Intl.NumberFormat('id-ID');

export const formatAngka = (value: number) => angkaFormatter.format(value);

export const formatRupiah = (value: number) => `${value < 0 ? '-' : ''}Rp. ${formatAngka(Math.abs(value))}`;

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
