"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { fetchPermintaan } from '@/domains/ppic/data/pembelian';
import TambahPermintaanPembelianPPIC from '@/domains/ppic/components/PermintaanPembelianTambah';
import { useApiData } from '@/shared/lib/use-api-data';

export default function PermintaanPembelianRevisi() {
  const { id } = useParams<{ id: string }>();
  const { data: permintaan, loading, error } = useApiData(() => fetchPermintaan(id), id, 'Gagal memuat permintaan pembelian.');

  if (loading || error) {
    return <div className="p-6 text-center text-sm text-gray-400 italic">{error || 'Memuat data...'}</div>;
  }
  if (!permintaan || permintaan.statusApi !== 'revision_requested') {
    return <div className="p-6 text-center text-sm text-gray-500">Permintaan ini tidak sedang menunggu revisi.</div>;
  }
  return <TambahPermintaanPembelianPPIC permintaan={permintaan} />;
}
