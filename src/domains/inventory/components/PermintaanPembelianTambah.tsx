"use client";

import TambahPermintaanPembelianPPIC from '@/domains/ppic/components/PermintaanPembelianTambah';
import { gudang_permintaan_pembelian_path } from '@/domains/inventory/permintaan-pembelian';
import { useAuthUser } from '@/domains/auth/user-context';
import { NAV_DIVISIONS } from '@/domains/auth/nav';

// Same form as PPIC; after saving it returns to the Gudang list.
export default function PermintaanPembelianTambahGudang() {
  const user = useAuthUser();
  const initialPemohon = user ? {
    bagian: NAV_DIVISIONS.find((division) => division.domains?.includes(user.domainCode ?? ''))?.label ?? 'Gudang',
    namaPemohon: user.username,
    jabatan: user.roleName,
  } : undefined;
  return <TambahPermintaanPembelianPPIC basePath={gudang_permintaan_pembelian_path} initialPemohon={initialPemohon} readOnlyPemohon />;
}
