import { barisBahanKosong, KATEGORI_BAHAN, type EstimasiPenawaran, type StatusPenawaran } from '@/domains/ppic/data/penawaran-harga';

// Data dummy: belum ada API penawaran harga untuk purchasing, jadi data disimpan di memori browser.
// Data bertahan selama pindah halaman, tapi kembali ke contoh awal saat halaman di-refresh.

export type FormSph = Omit<EstimasiPenawaran, 'namaClient' | 'namaProyek'>;

export interface PenawaranSph {
  id: number;
  noOrder: string;
  namaProjek: string;
  status: StatusPenawaran;
  form: FormSph;
}

export const penawaran_sph_path = '/dashboard/purchasing/transaksi/penawaran-harga';

export const estimasiSphPath = (id: number | string) => `${penawaran_sph_path}/estimasi-penawaran-biaya/${id}`;

const formKosong = (): FormSph => ({
  tanggal: '', pekerjaan: '', ruangan: '', ukuran: '', jumlah: '', tglMulaiProduksi: '', tglSelesaiProduksi: '',
  bahan: KATEGORI_BAHAN.map(() => [barisBahanKosong(), barisBahanKosong()]),
});

let data: PenawaranSph[] = [
  { id: 1, noOrder: '0000000001', namaProjek: 'Projek Hermina Tangerang', status: 'Publish', form: formKosong() },
];

export const listSph = () => data;

export const getSph = (id: number) => data.find((item) => item.id === id);

export const tambahSph = (namaProjek: string): PenawaranSph => {
  const id = Math.max(0, ...data.map((item) => item.id)) + 1;
  const baru: PenawaranSph = { id, noOrder: String(id).padStart(10, '0'), namaProjek, status: 'Draft', form: formKosong() };
  data = [...data, baru];
  return baru;
};

export const simpanSph = (id: number, form: FormSph) => {
  data = data.map((item) => (item.id === id ? { ...item, form } : item));
};
