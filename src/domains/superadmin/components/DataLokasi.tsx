import DataLokasi from '@/domains/inventory/components/DataLokasi';

// Super Admin uses the Gudang Data Lokasi screen with its own indigo pagination.
export default function DataLokasiSuperadmin() {
  return <DataLokasi paginationActiveClass="bg-indigo-600 text-white border-indigo-600" />;
}
