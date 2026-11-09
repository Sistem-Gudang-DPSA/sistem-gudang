import DataBarang from './DataBarang';

// Gudang Barang Jadi uses the Gudang Data Barang screen with its own rose pagination.
export default function DataBarangBarangJadi() {
  return <DataBarang paginationActiveClass="bg-rose-500 text-white border-rose-500" />;
}
