"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { dashboardPathFor } from "../api";
import type { AuthUser } from "../types";

export default function AccessDenied({ user }: { user: AuthUser }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 animate-in fade-in duration-500">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-6">
        <ShieldAlert className="w-10 h-10 text-red-500" />
      </div>
      <p className="text-sm font-semibold text-red-500 tracking-widest mb-2">403</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
      <p className="text-gray-500 max-w-md mb-8">
        Peran <span className="font-semibold text-gray-700">{user.roleName}</span> tidak punya izin untuk membuka halaman ini.
        Hubungi administrator jika Anda membutuhkan akses.
      </p>
      <Link
        href={dashboardPathFor(user)}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
