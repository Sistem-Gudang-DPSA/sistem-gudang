"use client";

import { useAuthUser } from '@/domains/auth/user-context';
import { NAV_DIVISIONS } from '@/domains/auth/nav';
import TambahPermintaanPembelianPPIC from './PermintaanPembelianTambah';

// Identitas pemohon diisi dari akun login dan dikunci, seperti pada form Gudang.
// basePath menentukan divisi tujuan setelah permintaan disimpan.
export default function PermintaanPembelianTambahDariAkun({ basePath, fallbackBagian }: { basePath: string; fallbackBagian: string }) {
  const user = useAuthUser();
  const initialPemohon = user ? {
    bagian: NAV_DIVISIONS.find((division) => division.domains?.includes(user.domainCode ?? ''))?.label ?? fallbackBagian,
    namaPemohon: user.username,
    jabatan: user.roleName,
  } : undefined;
  return <TambahPermintaanPembelianPPIC basePath={basePath} initialPemohon={initialPemohon} readOnlyPemohon />;
}
