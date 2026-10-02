"use client";

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PermintaanPembelianPPIC from '@/domains/ppic/components/PermintaanPembelian';
import { buatPoPath, rekap_pembelian_path } from '@/domains/purchasing/data/pembelian';

// Isi halamannya sama dengan PPIC; di purchasing tombol Revisi/Setuju diganti tombol Buat PO
export default function PermintaanPembelianPurchasing() {
  const { id } = useParams<{ id: string }>();

  return (
    <PermintaanPembelianPPIC
      backPath={rekap_pembelian_path}
      actions={
        <Link
          href={buatPoPath(id)}
          className="min-w-24 px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all text-sm text-center"
        >
          Buat PO
        </Link>
      }
    />
  );
}
