export type StatusPenawaran = 'Draft' | 'Publish';

export interface PenawaranHarga {
  id: number;
  noOrder: string;
  namaClient: string;
  status: StatusPenawaran;
}

export const KATEGORI_BAHAN = ['Lembaran & Bahan Baku', 'Supplier', 'Perabotan', 'Finishing', 'Packing', 'Tenaga'] as const;

// Nilai disimpan apa adanya dari input form (string), angka dihitung saat ditampilkan
export interface BarisBahan {
  namaBahan: string;
  satuan: string;
  panjang: string;
  lebar: string;
  tinggi: string;
  jumlahSatuan: string;
  jumlahOrder: string;
  hargaSatuan: string;
  keterangan: string;
}

export interface EstimasiPenawaran {
  tanggal: string; // YYYY-MM-DD
  pekerjaan: string;
  ruangan: string;
  ukuran: string;
  jumlah: string;
  tglMulaiProduksi: string; // YYYY-MM-DD
  tglSelesaiProduksi: string; // YYYY-MM-DD
  bahan: BarisBahan[][]; // urutannya mengikuti KATEGORI_BAHAN
}

export const penawaran_harga_path = '/dashboard/ppic/master/penawaran-harga';

export const estimasiPenawaranPath = (id: number | string) => `${penawaran_harga_path}/estimasi-penawaran-biaya/${id}`;

export const barisBahanKosong = (): BarisBahan => ({
  namaBahan: '', satuan: '', panjang: '', lebar: '', tinggi: '', jumlahSatuan: '', jumlahOrder: '', hargaSatuan: '', keterangan: '',
});

// Data dummy sementara (belum terhubung ke API)
const penawaranList: PenawaranHarga[] = [
  { id: 1, noOrder: '0000000001', namaClient: 'Projek Hermina Tangerang', status: 'Publish' },
];

export const getPenawaranList = () => penawaranList;

// Estimasi per penawaran disimpan di memori modul. Data kembali ke awal saat halaman di-refresh.
let estimasiMap: Record<number, EstimasiPenawaran> = {};

export const getEstimasi = (id: number): EstimasiPenawaran =>
  estimasiMap[id] ?? {
    tanggal: '', pekerjaan: '', ruangan: '', ukuran: '', jumlah: '', tglMulaiProduksi: '', tglSelesaiProduksi: '',
    bahan: KATEGORI_BAHAN.map(() => [barisBahanKosong(), barisBahanKosong()]),
  };

export const saveEstimasi = (id: number, estimasi: EstimasiPenawaran) => {
  estimasiMap = { ...estimasiMap, [id]: estimasi };
};
