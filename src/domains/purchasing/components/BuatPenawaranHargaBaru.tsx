"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BuatSPHBaru(){

    const header = (
        <div className="flex items-center gap-3 mb-6">
            <Link
                href="/dashboard/purchasing/transaksi/penawaran-harga"
                aria-label="Kembali"
                className="text-gray-800 hover:opacity-70 transition-opacity"
            >
                <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            </Link>

            <h1 className="text-[18px] font-extrabold text-black tracking-wide">
                Penawaran Harga
            </h1>
        </div>
    );
    
    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {header}
        </div>
    )
}