"use client";

import RekapDokubahView from '@/domains/ppic/components/RekapDokubahView';
import { detailRekapDokubahPath } from '@/domains/ppic/data/dokubah';

export default function RekapDokubah() {
  return <RekapDokubahView detailPath={detailRekapDokubahPath} showAnggaran />;
}
