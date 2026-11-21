"use client";

import { RekapPembelianReport as RekapPembelian } from '@/domains/purchasing/components/RekapPembelian';
import { lihatPermintaanPath } from '@/domains/ppic/data/pembelian';

export default function RekapPembelianPpic() {
  return <RekapPembelian lihatPath={lihatPermintaanPath} />;
}
