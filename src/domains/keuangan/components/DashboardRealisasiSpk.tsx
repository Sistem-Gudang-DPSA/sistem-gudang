"use client";

import React from 'react';
import { RealisasiSpkReport as SharedReport } from '@/domains/inventory/components/DashboardRealisasiSpk';
import { realisasiSpkDetailPath } from '@/domains/inventory/components/RealisasiSPK';

export default function RealisasiSpk() {
  return <RealisasiSpkReport />;
}

export function RealisasiSpkReport({ detailBasePath }: { detailBasePath?: string }) {
  return <SharedReport rowHref={(id) => detailBasePath ? `${detailBasePath}/${encodeURIComponent(id)}` : realisasiSpkDetailPath(id)} />;
}
