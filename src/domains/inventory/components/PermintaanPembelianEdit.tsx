"use client";

import PermintaanPembelianEdit from '@/domains/ppic/components/PermintaanPembelianEdit';
import { gudang_permintaan_pembelian_path } from '../permintaan-pembelian';

export default function EditPermintaanPembelianGudang() {
  return <PermintaanPembelianEdit basePath={gudang_permintaan_pembelian_path} />;
}
