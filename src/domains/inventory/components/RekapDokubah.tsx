"use client";

import { usePathname } from 'next/navigation';
import RekapDokubahView from '@/domains/ppic/components/RekapDokubahView';
import { gudangBasePath } from '../base-path';

export default function RekapDokubah() {
  const base = gudangBasePath(usePathname());
  return <RekapDokubahView detailPath={(id) => `${base}/laporan/dokubah/detail-dokubah/${id}`} sortable />;
}
