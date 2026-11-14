"use client";

import { RealisasiSpkReport } from "@/domains/keuangan/components/DashboardRealisasiSpk";

export const realisasiSpkPath = "/dashboard/produksi/laporan/realisasi-spk";

export default function RealisasiSPK() {
  return <RealisasiSpkReport detailBasePath={realisasiSpkPath} />;
}
