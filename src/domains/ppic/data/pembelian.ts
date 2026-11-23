import { getApprovalDetail, listApprovals } from '@/domains/ppic/api';
import type { ApprovalAction, ApprovalRequest, ApprovalStatus, PurchaseRequestItem } from '@/domains/ppic/types';

export type StatusPermintaan = 'Belum Disetujui' | 'Disetujui' | 'Perlu Revisi' | 'Ditolak' | 'Dibatalkan' | 'Menunggu PPIC' | 'Menunggu Purchasing';

export type BarangPermintaan = PurchaseRequestItem;

export interface PermintaanPembelian {
  id: number;
  tanggal: string; // YYYY-MM-DD
  permintaan: string;
  status: StatusPermintaan;
  statusApi: ApprovalStatus;
  currentStepOrder?: number;
  bagian: string;
  nama: string;
  jabatan: string;
  barang: BarangPermintaan[];
  periode?: string;
  requestedBy?: number;
  // Progres pembelian dari backend: dihitung dari qty PO aktif (tidak termasuk PO batal).
  purchaseStatus?: 'NOT_PURCHASED' | 'PARTIALLY_PURCHASED' | 'PURCHASED';
  catatan?: string;
  riwayat?: ApprovalAction[];
  lampiranRekapDokubah?: string;
  lampiranKartuStok?: string;
}

export const rekap_pembelian_path = '/dashboard/ppic/laporan/rekap-pembelian';

export const lihatPermintaanPath = (id: number | string) => `${rekap_pembelian_path}/permintaan-pembelian/${id}`;

export const STATUS_LABEL: Record<ApprovalStatus, StatusPermintaan> = {
  pending: 'Belum Disetujui',
  approved: 'Disetujui',
  revision_requested: 'Perlu Revisi',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

export const statusPersetujuanPermintaan = (request: Pick<ApprovalRequest, 'status' | 'currentStepOrder'>): StatusPermintaan =>
  request.status === 'pending' && request.currentStepOrder === 2 ? 'Menunggu PPIC'
    : request.status === 'pending' && request.currentStepOrder === 3 ? 'Menunggu Purchasing'
      : STATUS_LABEL[request.status];

const toPermintaan = (req: ApprovalRequest): PermintaanPembelian => {
  const p = req.payload;
  const barang = p?.items ?? [];
  return {
    id: req.id,
    tanggal: (p?.tanggalPengajuan ?? req.createdAt).slice(0, 10),
    permintaan: p?.notes || `${p?.bagian ?? '-'} - ${barang.length} barang`,
    status: statusPersetujuanPermintaan(req),
    currentStepOrder: req.currentStepOrder,
    statusApi: req.status,
    bagian: p?.bagian ?? '-',
    nama: p?.namaPemohon ?? '-',
    jabatan: p?.jabatan ?? '-',
    barang,
    periode: p?.periode,
    requestedBy: req.requestedBy,
    purchaseStatus: req.purchaseStatus,
    catatan: p?.notes,
    // Lampiran belum ada di payload purchase-request, jadi selalu kosong.
  };
};

export const fetchPermintaanList = async ({ page = 1, search = '', sortBy, sortDir }: { page?: number; search?: string; sortBy?: string; sortDir?: 'asc' | 'desc' } = {}) => {
  const res = await listApprovals({ page, pageSize: 20, type: 'purchase-request', search: search.trim() || undefined, sortBy, sortDir });
  return { rows: res.rows.map(toPermintaan), total: res.total };
};

export const fetchPermintaan = async (id: string): Promise<PermintaanPembelian> => {
  const { request, actions } = await getApprovalDetail(id);
  return { ...toPermintaan(request), riwayat: actions };
};

export const permintaan_pembelian_path = '/dashboard/ppic/transaksi/permintaan-pembelian';

export const revisiPath = (id: number | string) => `${permintaan_pembelian_path}/${id}/revisi`;

export const AKSI_LABEL: Record<string, string> = {
  approved: 'Disetujui',
  rejected: 'Ditolak',
  revision_requested: 'Minta Revisi',
  cancelled: 'Dibatalkan',
};
