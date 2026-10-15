"use client";

import TambahPermintaanPembelianPPIC from '@/domains/ppic/components/PermintaanPembelianTambah';
import { gudang_permintaan_pembelian_path } from '@/domains/inventory/permintaan-pembelian';

// Same form as PPIC; after saving it returns to the Gudang list.
export default function PermintaanPembelianTambahGudang() {
  return <TambahPermintaanPembelianPPIC basePath={gudang_permintaan_pembelian_path} />;
}
