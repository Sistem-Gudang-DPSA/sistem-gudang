import { COMPANY_NAME } from '@/shared/lib/company';

export const po_barang_path = '/dashboard/purchasing/transaksi/buat-po-barang';

export const detailPoPath = (id: number | string) => `${po_barang_path}/detail-po/${id}`;

export const rekap_pembelian_path = '/dashboard/purchasing/laporan/rekap-pembelian';

export const lihatPermintaanPath = (id: number | string) => `${rekap_pembelian_path}/permintaan-pembelian/${id}`;

export const buatPoPath = (id: number | string) => `${rekap_pembelian_path}/buat-po/${id}`;

// Data perusahaan pemesan yang tercetak di PO
export const PEMESAN = {
  nama: COMPANY_NAME,
  npwp: '74.978.025.0.542.000',
  alamatPengiriman: 'Jl. Mataram No.88, Ringinsari, Maguwoharjo, Depok, Sleman, Yogyakarta',
  pic: 'Betty / 83104928042',
};
