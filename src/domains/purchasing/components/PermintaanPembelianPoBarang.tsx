"use client";

import { PermintaanPembelianDetail } from './PermintaanPembelian';
import { po_barang_path } from '../data/pembelian';

// Detail permintaan yang dibuka dari daftar PO Barang: tombol kembali menuju daftar PO Barang, bukan Rekap Pembelian.
export default function PermintaanPembelianPoBarang() {
  return <PermintaanPembelianDetail backPath={po_barang_path} fromPoBarang />;
}
