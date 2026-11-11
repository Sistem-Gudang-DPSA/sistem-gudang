"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageSquareWarning } from "lucide-react";

const LAPORAN_SAYA_HREF = "/dashboard/laporan-masalah";

// Sidebar entry to the user's own reports page (superadmin has its own entry).
export default function LaporMasalahButton({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Deep link from a notification: /dashboard?laporan=saya
  useEffect(() => {
    if (searchParams.get("laporan") === "saya") router.replace(LAPORAN_SAYA_HREF);
  }, [searchParams, router]);

  const active = pathname === LAPORAN_SAYA_HREF;
  return (
    <div className="mt-4">
      <Link
        href={LAPORAN_SAYA_HREF}
        onClick={onNavigate}
        className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-amber-50 hover:text-amber-700 ${
          active ? "bg-amber-50 text-amber-700" : "text-gray-600"
        }`}
      >
        <MessageSquareWarning className="h-5 w-5" />
        <span className="font-medium">Laporkan Masalah</span>
      </Link>
    </div>
  );
}
