"use client";

import { useParams } from "next/navigation";
import { RincianSpkDetail } from "@/domains/keuangan/components/DetailRealisasiSPK";
import { realisasiSpkPath } from "./RealisasiSPK";

export default function DetailRealisasiSPK() {
  const { id } = useParams<{ id: string }>();
  const noSpk = decodeURIComponent(id ?? "");
  return <RincianSpkDetail key={noSpk} noSpk={noSpk} mode="biaya" backHref={realisasiSpkPath} />;
}
