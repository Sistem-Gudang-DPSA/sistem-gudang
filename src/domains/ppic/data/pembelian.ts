import { getApprovalDetail, listApprovals } from '@/domains/ppic/api';
import type { ApprovalAction, ApprovalRequest, ApprovalStatus } from '@/domains/ppic/types';

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
  statusApi: ApprovalStatus;
  bagian: string;
  nama: string;
  jabatan: string;
  barang: BarangPermintaan[];
  catatan?: string;
  riwayat?: ApprovalAction[];
  lampiranRekapDokubah?: string;
  lampiranKartuStok?: string;
}

export const rekap_pembelian_path = '/dashboard/ppic/laporan/rekap-pembelian';

export const lihatPermintaanPath = (id: number | string) => `${rekap_pembelian_path}/permintaan-pembelian/${id}`;

const STATUS_LABEL: Record<ApprovalStatus, StatusPermintaan> = {
  pending: 'Belum Disetujui',
  approved: 'Disetujui',
  revision_requested: 'Perlu Revisi',
  rejected: 'Ditolak',
};

const toPermintaan = (req: ApprovalRequest): PermintaanPembelian => {
  const p = req.payload;
  const barang = p?.items ?? [];
  return {
    id: req.id,
    tanggal: (p?.tanggalPengajuan ?? req.createdAt).slice(0, 10),
    permintaan: p?.notes || `${p?.bagian ?? '-'} - ${barang.length} barang`,
    status: STATUS_LABEL[req.status],
    statusApi: req.status,
    bagian: p?.bagian ?? '-',
    nama: p?.namaPemohon ?? '-',
    jabatan: p?.jabatan ?? '-',
    barang,
    catatan: p?.notes,
    // Lampiran belum ada di payload purchase-request, jadi selalu kosong.
  };
};

// ponytail: loads first 100 rows only, add real pagination when the list outgrows it
export const fetchPermintaanList = async () =>
  (await listApprovals({ pageSize: 100, type: 'purchase-request' })).rows.map(toPermintaan);

export const fetchPermintaan = async (id: string): Promise<PermintaanPembelian> => {
  const { request, actions } = await getApprovalDetail(id);
  return { ...toPermintaan(request), riwayat: actions };
};

export const revisiPath = (id: number | string) => `/dashboard/ppic/transaksi/permintaan-pembelian/${id}/revisi`;

export const AKSI_LABEL: Record<string, string> = {
  approved: 'Disetujui',
  rejected: 'Ditolak',
  revision_requested: 'Minta Revisi',
};
