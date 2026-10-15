"use client";

import DaftarPermintaanPembelianPPIC from '@/domains/ppic/components/DaftarPermintaanPembelian';
import { gudang_permintaan_pembelian_path } from '@/domains/inventory/permintaan-pembelian';

// Same list as PPIC, kept under the Gudang routes.
export default function PermintaanPembelianGudang() {
  return <DaftarPermintaanPembelianPPIC basePath={gudang_permintaan_pembelian_path} />;
}
