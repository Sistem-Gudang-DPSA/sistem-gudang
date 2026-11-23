"use client";

import React from 'react';
import Link from 'next/link';
import PermintaanPembelianPPIC from '@/domains/ppic/components/PermintaanPembelian';
import AksiPersetujuanPembelian from '@/domains/ppic/components/AksiPersetujuanPembelian';
import type { PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import { buatPoPath, rekap_pembelian_path } from '@/domains/purchasing/data/pembelian';
import { useCan } from '@/domains/auth/user-context';
import DaftarPoPermintaan from './DaftarPoPermintaan';

const buttonClass = 'min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center disabled:opacity-50';

function AksiPurchasing({ permintaan, reload, fromPoBarang = false }: { permintaan: PermintaanPembelian; reload: () => void; fromPoBarang?: boolean }) {
  const canCreatePo = useCan('purchase-order.create');
  if (permintaan.statusApi === 'approved') {
    // Semua baris sudah masuk PO aktif: tidak perlu PO baru.
    if (permintaan.purchaseStatus === 'PURCHASED') {
      return <p className="text-sm text-gray-600">Semua barang sudah dipesan lewat PO.</p>;
    }
    return canCreatePo ? <Link href={`${buatPoPath(permintaan.id)}${fromPoBarang ? '?from=permintaan-po-barang' : ''}`} className={buttonClass}>Buat PO</Link> : null;
  }
  return <AksiPersetujuanPembelian permintaan={permintaan} reload={reload} tahap="purchasing" />;
}

// Varian halaman dengan konteks asal; halaman route hanya mengekspor komponen tanpa prop.
export function PermintaanPembelianDetail({ backPath = rekap_pembelian_path, fromPoBarang = false }: { backPath?: string; fromPoBarang?: boolean }) {
  return (
    <PermintaanPembelianPPIC
      backPath={backPath}
      actions={(permintaan, reload) => <AksiPurchasing permintaan={permintaan} reload={reload} fromPoBarang={fromPoBarang} />}
      sections={(permintaan) => <DaftarPoPermintaan permintaan={permintaan} />}
    />
  );
}

export default function PermintaanPembelianPurchasing() {
  return <PermintaanPembelianDetail />;
}
