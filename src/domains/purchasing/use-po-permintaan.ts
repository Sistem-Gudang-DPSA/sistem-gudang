import { fetchAllPages } from '@/shared/lib/fetch-all';
import { useApiData } from '@/shared/lib/use-api-data';
import { getPurchaseOrder, listPurchaseOrders } from './api';
import type { PurchaseOrder } from './types';

// PO aktif (bukan batal) milik satu permintaan pembelian, lengkap dengan barisnya.
// Dibutuhkan untuk menandai baris permintaan yang sudah dipesan saat membuat PO berikutnya.
export function usePoPermintaan(approvalRequestId: number) {
  const { data, loading, error, reload } = useApiData(
    async () => {
      const list = await fetchAllPages((page, pageSize) => listPurchaseOrders({ page, pageSize, approvalRequestId }));
      const details = await Promise.all(list.map((po) => getPurchaseOrder(po.id)));
      return details.filter((po) => po.status !== 'CANCELLED');
    },
    `po-permintaan|${approvalRequestId}`,
    'Gagal memuat daftar PO.',
  );
  const pos: PurchaseOrder[] = data ?? [];
  return { pos, loading, error, reload };
}

// Baris permintaan (index mulai 0) yang sudah masuk PO aktif.
export function lineSudahDipesan(pos: PurchaseOrder[]): Set<number> {
  return new Set(pos.flatMap((po) => po.barang.flatMap((line) => (line.lineIndex == null ? [] : [line.lineIndex]))));
}
