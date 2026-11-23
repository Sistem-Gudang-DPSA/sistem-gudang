"use client";

import { useState } from 'react';
import { useCan } from '@/domains/auth/user-context';
import { useApiData } from '@/shared/lib/use-api-data';
import { useClampPage, usePage } from '@/shared/lib/use-page';
import { useDebouncedValue } from '@/shared/lib/use-debounced-value';
import Modal from '@/shared/components/Modal';
import Pagination from '@/shared/components/Pagination';
import { listItems } from '../api';
import type { Location } from '../types';

type Props = { location: Location };

export default function BarangLokasi({ location }: Props) {
  const canView = useCan('item.view');
  return canView ? <InformasiBarang location={location} /> : <span className="text-xs text-gray-500">Tidak memiliki izin melihat barang.</span>;
}

function InformasiBarang({ location }: Props) {
  const [open, setOpen] = useState(false);
  const { data, loading, error, reload } = useApiData(
    () => listItems({ locationId: location.id, page: 1, pageSize: 3, sortBy: 'name', sortDir: 'asc' }),
    `barang-lokasi-ringkasan|${location.id}`,
    'Gagal memuat informasi barang.',
  );
  return (
    <div className="min-w-56 max-w-sm whitespace-normal">
      {loading ? <p className="text-xs text-gray-500">Memuat barang...</p> : error ? (
        <p role="alert" className="text-xs text-red-600">{error} <button type="button" onClick={reload} className="underline" aria-label={`Coba lagi informasi barang ${location.code}`}>Coba lagi</button></p>
      ) : (
        <>
          <p className="font-medium text-gray-700">{data?.total ? `${data.total} jenis barang` : 'Belum ada barang di lokasi ini.'}</p>
          <p className="mt-1 text-xs text-gray-500">{data?.rows.map((item) => item.name).join(', ')}{data && data.total > data.rows.length ? `, dan ${data.total - data.rows.length} lainnya` : ''}</p>
        </>
      )}
      <button type="button" onClick={() => setOpen(true)} aria-label={`Lihat barang di lokasi ${location.code}`} className="mt-2 px-3 py-1 bg-orange-50 text-orange-700 font-bold rounded-lg text-xs hover:bg-orange-100 border border-orange-100">Lihat Barang</button>
      {open && <DaftarBarangLokasi location={location} onClose={() => setOpen(false)} />}
    </div>
  );
}

function DaftarBarangLokasi({ location, onClose }: Props & { onClose: () => void }) {
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search, 300);
  const [page, setPage] = usePage(query);
  const pageSize = 20;
  const { data, loading, error, reload } = useApiData(
    () => listItems({ locationId: location.id, search: query.trim() || undefined, page, pageSize, sortBy: 'name', sortDir: 'asc' }),
    `barang-lokasi-detail|${location.id}|${query}|${page}`,
    'Gagal memuat barang di lokasi ini.',
  );
  useClampPage(page, data?.total ?? 0, pageSize, setPage);
  return (
    <Modal title={`Barang di Lokasi ${location.code}`} onClose={onClose} size="xl">
      <p className="mb-4 text-sm text-gray-600">Rak {location.rackName}, nomor {location.rackNumber}. Daftar barang yang ditempatkan pada lokasi ini, termasuk barang dengan stok nol.</p>
      <input type="search" aria-label="Cari barang di lokasi" placeholder="Cari kode atau nama barang..." value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} className="mb-4 w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error} <button type="button" onClick={reload} className="underline">Coba lagi</button></p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr>
            {['No', 'Kode Barang', 'Nama Barang', 'Kategori', 'Stok', 'Satuan'].map((label) => <th key={label} scope="col" className="px-3 py-3 whitespace-nowrap">{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Memuat barang...</td></tr>}
            {!loading && !error && data?.rows.map((item, index) => (
              <tr key={item.id}>
                <td className="px-3 py-3">{(page - 1) * pageSize + index + 1}</td>
                <td className="px-3 py-3 whitespace-nowrap">{item.code || '-'}</td>
                <td className="px-3 py-3 min-w-48"><p className="font-medium text-gray-900">{item.name}</p>{item.detail && <p className="mt-1 text-xs text-gray-500">{item.detail}</p>}</td>
                <td className="px-3 py-3">{item.category || '-'}</td>
                <td className="px-3 py-3 text-right">{item.stock.toLocaleString('id-ID')}</td>
                <td className="px-3 py-3">{item.unit}</td>
              </tr>
            ))}
            {!loading && !error && data?.rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">{query.trim() ? 'Barang tidak ditemukan untuk pencarian ini.' : 'Belum ada barang di lokasi ini.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={loading || error ? 0 : data?.total ?? 0} onPageChange={setPage} />
    </Modal>
  );
}
