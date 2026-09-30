export interface BarangMasukItems {
  id: string | number;
  tanggalJam: string;
  noReferensi: string;
  noSuratJalanSupplier?: string;
  namaPemasok: string;
  sumberInbound: 'SUPPLIER' | 'PRODUKSI';
  totalVolumeQty: number;
  satuan: string;
  statusQc: 'PASS' | 'PARTIAL_RETUR';
  catatan?: string;
  location: string;
}

export interface LaporanBarangMasukFilter {
  startDate?: string;
  endDate?: string;
  sumber?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BarangKeluarItems {
    id: string | number;
    namaBarang: string;
    asalGudang: 'BAHAN BAKU' | 'WIP' | 'BARANG JADI';
    tujuanPenerima: 'PRODUKSI' | 'KLIEN';
    noSPK: string;
    tanggal: string;
    jumlah: number; 
}

export interface LaporanBarangKeluarFilter {
    search?: string;
    asalGudang?: string;
    penerima?: string;
    tanggal?: string;
}

export interface RekapStokOpname {
  id: string | number;
  namaRekap: string;
  tanggal: string;
  auditor: string;
}