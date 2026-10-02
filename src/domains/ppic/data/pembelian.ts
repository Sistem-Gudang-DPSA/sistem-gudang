import { listApprovals } from '@/domains/gudang/api';
import type { ApprovalRequest, ApprovalStatus } from '@/domains/gudang/types';

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
    bagian: p?.bagian ?? '-',
    nama: p?.namaPemohon ?? '-',
    jabatan: p?.jabatan ?? '-',
    barang,
    // Lampiran belum ada di payload purchase-request, jadi selalu kosong.
  };
};

// ponytail: loads first 100 rows only, add real pagination when the list outgrows it
export const fetchPermintaanList = async () =>
  (await listApprovals({ pageSize: 100, type: 'purchase-request' })).rows.map(toPermintaan);

// ponytail: the BE has no GET /approvals/{id}, so the detail is found in the list
export const fetchPermintaan = async (id: string) =>
  (await fetchPermintaanList()).find((item) => String(item.id) === id) ?? null;
