"use client";

import PermintaanPembelianTambahDariAkun from '@/domains/ppic/components/PermintaanPembelianTambahDariAkun';
import { gudang_permintaan_pembelian_path } from '../permintaan-pembelian';

// Same form as PPIC; after saving it returns to the Gudang list.
export default function PermintaanPembelianTambahGudang() {
  return <PermintaanPembelianTambahDariAkun basePath={gudang_permintaan_pembelian_path} fallbackBagian="Gudang" />;
}
