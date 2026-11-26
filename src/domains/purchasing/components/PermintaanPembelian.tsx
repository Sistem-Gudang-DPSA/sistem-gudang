"use client";

import React from 'react';
import PermintaanPembelianPPIC from '@/domains/ppic/components/PermintaanPembelian';
import type { PermintaanPembelian } from '@/domains/ppic/data/pembelian';
import { rekap_pembelian_path } from '@/domains/purchasing/data/pembelian';
import DaftarPoPermintaan from './DaftarPoPermintaan';
import RincianPermintaanPurchasing from './RincianPermintaanPurchasing';

function AksiPurchasing({ permintaan }: { permintaan: PermintaanPembelian }) {
  if (permintaan.statusApi === 'approved') {
    // Semua baris sudah masuk PO aktif: tidak perlu PO baru.
    if (permintaan.purchaseStatus === 'PURCHASED') {
      return <p className="text-sm text-gray-600">Semua barang sudah dipesan lewat PO.</p>;
    }
    return null;
  }
  if (permintaan.statusApi === 'pending') {
    return <p className="text-sm text-gray-600">{permintaan.currentStepOrder === 3 ? 'Lengkapi supplier dan Qty Beli, lalu buat PO.' : 'Menunggu persetujuan PPIC.'}</p>;
  }
  return <p className="text-sm text-gray-600">Status permintaan: {permintaan.status}</p>;
}

// Varian halaman dengan konteks asal; halaman route hanya mengekspor komponen tanpa prop.
export function PermintaanPembelianDetail({ backPath = rekap_pembelian_path, fromPoBarang = false }: { backPath?: string; fromPoBarang?: boolean }) {
  return (
    <PermintaanPembelianPPIC
      backPath={backPath}
      showApprovalHistory={false}
      detailBarang={(permintaan) => <RincianPermintaanPurchasing key={permintaan.id} permintaan={permintaan} fromPoBarang={fromPoBarang} />}
      actions={(permintaan) => <AksiPurchasing permintaan={permintaan} />}
      sections={(permintaan) => <DaftarPoPermintaan permintaan={permintaan} />}
    />
  );
}

export default function PermintaanPembelianPurchasing() {
  return <PermintaanPembelianDetail />;
}
