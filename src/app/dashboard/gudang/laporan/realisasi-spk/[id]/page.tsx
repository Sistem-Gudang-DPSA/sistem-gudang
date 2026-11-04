// app/.../realisasi-spk/[id]/page.tsx
"use client";
import { useParams } from 'next/navigation';
import RincianSpkDetail from '@/domains/inventory/components/DetailRealisasiSPK';
import { realisasiSpkDetailPath, realisasiSpkPath } from '@/domains/inventory/components/RealisasiSPK';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <RincianSpkDetail id={Number(id)} mode="biaya" backHref={realisasiSpkPath} pathOf={realisasiSpkDetailPath} />;
}