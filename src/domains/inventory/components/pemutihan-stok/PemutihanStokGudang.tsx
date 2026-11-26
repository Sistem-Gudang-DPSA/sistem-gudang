"use client";

import { usePathname } from 'next/navigation';
import { gudangBasePath } from '../../base-path';
import { PemutihanStokList } from './PemutihanStokList';

export default function PemutihanStokGudang() {
  return <PemutihanStokList basePath={gudangBasePath(usePathname())} mode="gudang" />;
}
