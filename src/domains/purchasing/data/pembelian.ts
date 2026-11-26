import { COMPANY_NAME } from '@/shared/lib/company';

export const po_barang_path = '/dashboard/purchasing/transaksi/buat-po-barang';

export const editPoPath = (id: number | string) => `${po_barang_path}/edit-po/${id}`;

export const detailPoPath = (id: number | string) => `${po_barang_path}/detail-po/${id}`;

// Detail permintaan dibuka dari daftar PO Barang; halaman kembali ke daftar itu.
export const lihatPermintaanPoPath = (id: number | string) => `${po_barang_path}/permintaan-pembelian/${id}`;

export const rekap_pembelian_path = '/dashboard/purchasing/laporan/rekap-pembelian';

export const lihatPermintaanPath = (id: number | string) => `${rekap_pembelian_path}/permintaan-pembelian/${id}`;

export const buatPoPath = (id: number | string) => `/dashboard/purchasing/transaksi/buat-po-barang/buat-po/${id}`;

// Data perusahaan pemesan yang tercetak di PO
export const PEMESAN = {
  nama: COMPANY_NAME,
  npwp: '74.978.025.0.542.000',
  alamatPengiriman: 'Jl. Mataram No.88, Ringinsari, Maguwoharjo, Depok, Sleman, Yogyakarta',
  pic: 'Betty / 83104928042',
};
