"use client";

import { Suspense } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCan } from '@/domains/auth/user-context';
import { getItem } from '@/domains/inventory/api';
import Modal from '@/shared/components/Modal';
import { useApiData } from '@/shared/lib/use-api-data';

function ItemDetail({ itemId, onClose }: { itemId: number; onClose: () => void }) {
  const { data: item, loading, error } = useApiData(
    () => getItem(itemId),
    `stock-notification-item:${itemId}`,
    'Gagal memuat barang dari notifikasi.',
  );

  return (
    <Modal title="Barang dari notifikasi stok" onClose={onClose}>
      {loading && <p role="status">Memuat barang...</p>}
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {!loading && !error && item && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
          <p className="text-sm text-gray-500">Kode barang: {item.code ?? '-'}</p>
          <dl className="grid grid-cols-2 gap-4 rounded-xl bg-amber-50 p-4 text-sm">
            <div><dt>Sisa stok</dt><dd className="font-bold">{item.stock} {item.unit}</dd></div>
            <div><dt>Stok minimum</dt><dd className="font-bold">{item.minimumStock == null ? 'Tidak diatur' : `${item.minimumStock} ${item.unit}`}</dd></div>
          </dl>
          <p className="text-sm text-gray-500">Data stok terbaru saat barang dibuka.</p>
        </div>
      )}
    </Modal>
  );
}

function NotificationDetail() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const canView = useCan('item.view');
  const rawId = params.get('itemId');
  const itemId = Number(rawId);
  if (!canView || !rawId || !/^\d+$/.test(rawId) || !Number.isSafeInteger(itemId) || itemId <= 0) return null;

  const close = () => {
    const next = new URLSearchParams(params.toString());
    next.delete('itemId');
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  };
  return <ItemDetail key={itemId} itemId={itemId} onClose={close} />;
}

export default function StockNotificationDetail() {
  return <Suspense fallback={null}><NotificationDetail /></Suspense>;
}
