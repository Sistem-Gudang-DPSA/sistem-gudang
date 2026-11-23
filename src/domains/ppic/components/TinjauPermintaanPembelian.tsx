"use client";

import DetailPermintaanPembelian from './PermintaanPembelian';
import AksiPersetujuanPembelian from './AksiPersetujuanPembelian';
import { permintaan_pembelian_path } from '../data/pembelian';

export default function TinjauPermintaanPembelian() {
  return <DetailPermintaanPembelian backPath={permintaan_pembelian_path} actions={(permintaan, reload) => <AksiPersetujuanPembelian permintaan={permintaan} reload={reload} tahap="ppic" />} />;
}
