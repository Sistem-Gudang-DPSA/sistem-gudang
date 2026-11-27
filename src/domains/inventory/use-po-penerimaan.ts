import { getPurchaseOrder, listPurchaseOrders } from '@/domains/purchasing/api';
import type { PurchaseOrder, PurchaseOrderLine } from '@/domains/purchasing/types';
import { fetchAllPages } from '@/shared/lib/fetch-all';
import { useApiData } from '@/shared/lib/use-api-data';

export type BarisPoPenerimaan = Omit<PurchaseOrderLine, 'sisa'> & {
  sisa: number;
  purchaseOrderId: number;
  purchaseOrderLineId: number;
  nomorPo: string;
  supplierName: string;
};

// Hanya PO yang sudah disubmit yang boleh menerima barang. Dua status diambil
// karena daftar PO memakai filter status tunggal.
export function usePoPenerimaan() {
  const { data, loading, error, reload } = useApiData(
    async () => {
      const [issued, partially] = await Promise.all([
        fetchAllPages((page, pageSize) => listPurchaseOrders({ page, pageSize, status: 'ISSUED' })),
        fetchAllPages((page, pageSize) => listPurchaseOrders({ page, pageSize, status: 'PARTIALLY_RECEIVED' })),
      ]);
      const summaries = [...new Map([...issued, ...partially].map((po) => [po.id, po])).values()];
      const details = await Promise.all(summaries.map((po) => getPurchaseOrder(po.id)));
      return details.filter((po) => po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED');
    },
    'po-penerimaan',
    'Gagal memuat daftar PO.',
  );
  return { pos: data ?? [], loading, error, reload };
}

export function barisPoTersedia(po: PurchaseOrder): BarisPoPenerimaan[] {
  return po.barang
    .filter((line) => line.itemId != null && (line.sisa ?? 0) > 0)
    .map((line) => ({
      ...line,
      sisa: line.sisa ?? 0,
      purchaseOrderId: po.id,
      purchaseOrderLineId: line.id,
      nomorPo: po.nomorPo,
      supplierName: po.supplierName,
    }));
}
