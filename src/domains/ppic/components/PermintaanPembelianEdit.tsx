"use client";

import { useParams } from 'next/navigation';
import { useAuthUser, useCan } from '@/domains/auth/user-context';
import { useApiData } from '@/shared/lib/use-api-data';
import { fetchPermintaan, permintaan_pembelian_path } from '../data/pembelian';
import PermintaanPembelianTambah from './PermintaanPembelianTambah';
import NoPermission from './NoPermission';

export default function PermintaanPembelianEdit({ basePath = permintaan_pembelian_path }: { basePath?: string }) {
  const { id } = useParams<{ id: string }>();
  const user = useAuthUser();
  const canCreate = useCan('purchase-request.create');
  const { data, loading, error } = useApiData(() => fetchPermintaan(id), id, 'Gagal memuat permintaan pembelian.');
  if (!canCreate) return <NoPermission action="mengedit permintaan pembelian" />;
  if (loading || error) return <p role={error ? 'alert' : 'status'} className="p-6">{error || 'Memuat data...'}</p>;
  if (!data || !['pending', 'revision_requested'].includes(data.statusApi) || (user && !user.isSuperadmin && user.id !== data.requestedBy)) {
    return <p className="p-6">Permintaan ini tidak dapat diedit. Hanya pembuat permintaan yang masih diproses atau perlu revisi yang dapat mengedit.</p>;
  }
  return <PermintaanPembelianTambah key={data.id} permintaan={data} basePath={basePath} editing />;
}
