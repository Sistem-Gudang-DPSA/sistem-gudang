export type StatusPermintaan = 'Belum Disetujui' | 'Disetujui' | 'Perlu Revisi' | 'Ditolak';

export interface BarangPermintaan {
  namaBarang: string;
  qty: number;
  satuan: string;
  proyek: string;
  noSpk: string;
}

export interface PermintaanPembelian {
  id: number;
  tanggal: string; // YYYY-MM-DD
  permintaan: string;
  status: StatusPermintaan;
  bagian: string;
  nama: string;
  jabatan: string;
  barang: BarangPermintaan[];
  lampiranRekapDokubah?: string;
  lampiranKartuStok?: string;
}

export const rekap_pembelian_path = '/dashboard/ppic/laporan/rekap-pembelian';

export const lihatPermintaanPath = (id: number | string) => `${rekap_pembelian_path}/permintaan-pembelian/${id}`;

// Data dummy sementara (belum terhubung ke API), disimpan di memori modul supaya halaman rekap dan
// Permintaan Pembelian memakai data yang sama. Data kembali ke awal saat halaman di-refresh.
let permintaanList: PermintaanPembelian[] = [
  {
    id: 1,
    tanggal: '2026-02-01',
    permintaan: 'Permintaan hari jumat',
    status: 'Belum Disetujui',
    bagian: 'Purchasing',
    nama: 'Fauzi',
    jabatan: 'Admin Gudang',
    barang: [
      { namaBarang: 'Triplex 3mm', qty: 10, satuan: 'Lembaran', proyek: 'Hermina Banyumanik', noSpk: '97/SP/RSHPDN/I/2026' },
      { namaBarang: 'Cat putih', qty: 5, satuan: 'Kaleng', proyek: 'Hermina Banyumanik', noSpk: '97/SP/RSHPDN/I/2026' },
    ],
    lampiranRekapDokubah: 'Rekap.jpg',
    lampiranKartuStok: 'Stok.jpg',
  },
];

export const getPermintaanList = () => permintaanList;

export const setStatusPermintaan = (id: number, status: StatusPermintaan) => {
  permintaanList = permintaanList.map((item) => (item.id === id ? { ...item, status } : item));
};
