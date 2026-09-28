"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Package, UserCog, ShoppingCart, LayoutDashboard, LogOut, ChevronDown, ShieldCheck, Users } from 'lucide-react';
import { refreshSession, logout } from '@/domains/auth/api';
import type { AuthUser } from '@/domains/auth/types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    refreshSession()
      .then(setUser)
      .catch(() => router.push("/"))
      .finally(() => setIsMounted(true));
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!isMounted || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userRole = user.roleName.toLowerCase();
  const userName = user.username;
  const isSuperAdmin = user.isSuperadmin;
  const isGudang = userRole === "gudang" || isSuperAdmin;
  const isPPIC = userRole === "ppic" || isSuperAdmin;
  const isPurchasing = userRole === "purchasing" || isSuperAdmin;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-xl min-h-screen border-r border-gray-100 z-10 transition-all duration-300">
        <div className="flex items-center justify-center h-20 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">DPSA Sys</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="space-y-2">
            {isSuperAdmin && (
              <>
                <Link 
                  href="/dashboard/superadmin" 
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === "/dashboard/superadmin" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span className="font-medium">Dashboard SA</span>
                </Link>
                <Link 
                  href="/dashboard/superadmin/users" 
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === "/dashboard/superadmin/users" ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="font-medium">Kelola Data User</span>
                </Link>
              </>
            )}

            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium">Overview</span>
            </Link>
            
            <div className="pt-4 pb-2">
              <span className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Divisions</span>
            </div>

            {/* Gudang Section */}
            {isGudang && (
              <details className="group" open={isGudang}>
                <summary className="flex items-center justify-between px-4 py-3 text-gray-600 rounded-xl hover:bg-orange-50 hover:text-orange-600 cursor-pointer transition-all duration-200 list-none [&::-webkit-details-marker]:hidden border border-transparent hover:border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                      <Package className="w-4 h-4" />
                    </div>
                    <span className="font-semibold">Gudang</span>
                  </div>
                  <ChevronDown className="w-4 h-4 transition-transform group-open:-rotate-180 text-gray-400" />
                </summary>
                <div className="pl-6 pr-2 py-2 space-y-4 ml-4 border-l-2 border-orange-50 mt-1">
                  <details className="group/master" open={isGudang}>
                    <summary className="flex items-center justify-between text-sm font-bold text-gray-400 hover:text-orange-600 cursor-pointer list-none [&::-webkit-details-marker]:hidden uppercase tracking-wider mb-2">
                      <span>Master</span>
                      <ChevronDown className="w-3 h-3 transition-transform group-open/master:-rotate-180" />
                    </summary>
                    <div className="space-y-1">
                      <Link 
                        href="/dashboard/gudang/master/data-barang" 
                        className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/gudang/master/data-barang" ? "bg-orange-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}
                      >
                        Data Barang
                      </Link>
                      <Link 
                        href="/dashboard/gudang/master/data-lokasi" 
                        className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/gudang/master/data-lokasi" ? "bg-orange-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}
                      >
                        Data Lokasi
                      </Link>
                    </div>
                  </details>
                  
                  <details className="group/transaksi" open={isGudang}>
                    <summary className="flex items-center justify-between text-sm font-bold text-gray-400 hover:text-orange-600 cursor-pointer list-none [&::-webkit-details-marker]:hidden uppercase tracking-wider mb-2">
                      <span>Transaksi</span>
                      <ChevronDown className="w-3 h-3 transition-transform group-open/transaksi:-rotate-180" />
                    </summary>
                    <div className="space-y-1">
                      <Link href="/dashboard/gudang/transaksi/barang-masuk" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/gudang/transaksi/barang-masuk" ? "bg-orange-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}>Barang Masuk</Link>
                      <Link href="/dashboard/gudang/transaksi/barang-keluar" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/gudang/transaksi/barang-keluar" ? "bg-orange-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}>Barang Keluar</Link>
                      <Link href="/dashboard/gudang/transaksi/stock-opname" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/gudang/transaksi/stock-opname" ? "bg-orange-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}>Stock Opname</Link>
                      <Link href="/dashboard/gudang/transaksi/permintaan-pembelian" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/gudang/transaksi/permintaan-pembelian" ? "bg-orange-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}>Permintaan Pembelian</Link>
                    </div>
                  </details>

                  <details className="group/laporan" open={isGudang}>
                    <summary className="flex items-center justify-between text-sm font-bold text-gray-400 hover:text-orange-600 cursor-pointer list-none [&::-webkit-details-marker]:hidden uppercase tracking-wider mb-2">
                      <span>Laporan</span>
                      <ChevronDown className="w-3 h-3 transition-transform group-open/laporan:-rotate-180" />
                    </summary>
                    <div className="space-y-1">
                      <Link href="/dashboard/gudang/laporan/barang-masuk" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/gudang/laporan/barang-masuk" ? "bg-orange-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}>Rekap Data Barang Masuk</Link>
                      <Link href="/dashboard/gudang/laporan/barang-keluar" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/gudang/laporan/barang-keluar" ? "bg-orange-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}>Rekap Data Barang Keluar</Link>
                      <Link href="/dashboard/gudang/laporan/stock-opname" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/gudang/laporan/stock-opname" ? "bg-orange-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}>Rekap Stock Opname</Link>
                      <Link href="/dashboard/gudang/laporan/dokubah" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/gudang/laporan/dokubah" ? "bg-orange-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}>Rekap Dokubah</Link>
                      <Link href="/dashboard/gudang/laporan/pembelian" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/gudang/laporan/pembelian" ? "bg-orange-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-orange-600 hover:bg-orange-50"}`}>Rekap Pembelian</Link>
                    </div>
                  </details>
                </div>
              </details>
            )}

            {/* PPIC Section */}
            {isPPIC && (
              <details className="group" open={isPPIC}>
                <summary className="flex items-center justify-between px-4 py-3 text-gray-600 rounded-xl hover:bg-purple-50 hover:text-purple-600 cursor-pointer transition-all duration-200 list-none [&::-webkit-details-marker]:hidden border border-transparent hover:border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                      <UserCog className="w-4 h-4" />
                    </div>
                    <span className="font-semibold">PPIC</span>
                  </div>
                  <ChevronDown className="w-4 h-4 transition-transform group-open:-rotate-180 text-gray-400" />
                </summary>
                <div className="pl-6 pr-2 py-2 space-y-4 ml-4 border-l-2 border-purple-50 mt-1">
                  <details className="group/master" open={isPPIC}>
                    <summary className="flex items-center justify-between text-sm font-bold text-gray-400 hover:text-purple-600 cursor-pointer list-none [&::-webkit-details-marker]:hidden uppercase tracking-wider mb-2">
                      <span>Master</span>
                      <ChevronDown className="w-3 h-3 transition-transform group-open/master:-rotate-180" />
                    </summary>
                    <div className="space-y-1">
                      <Link href="/dashboard/ppic/master/data-barang" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/ppic/master/data-barang" ? "bg-purple-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"}`}>Data Barang</Link>
                      <Link href="/dashboard/ppic/master/penawaran-harga" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/ppic/master/penawaran-harga" ? "bg-purple-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"}`}>Penawaran Harga</Link>
                    </div>
                  </details>
                  
                  <details className="group/transaksi" open={isPPIC}>
                    <summary className="flex items-center justify-between text-sm font-bold text-gray-400 hover:text-purple-600 cursor-pointer list-none [&::-webkit-details-marker]:hidden uppercase tracking-wider mb-2">
                      <span>Transaksi</span>
                      <ChevronDown className="w-3 h-3 transition-transform group-open/transaksi:-rotate-180" />
                    </summary>
                    <div className="space-y-1">
                      <Link href="/dashboard/ppic/transaksi/dokubah" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/ppic/transaksi/dokubah" ? "bg-purple-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"}`}>Dokubah</Link>
                    </div>
                  </details>

                  <details className="group/laporan" open={isPPIC}>
                    <summary className="flex items-center justify-between text-sm font-bold text-gray-400 hover:text-purple-600 cursor-pointer list-none [&::-webkit-details-marker]:hidden uppercase tracking-wider mb-2">
                      <span>Laporan</span>
                      <ChevronDown className="w-3 h-3 transition-transform group-open/laporan:-rotate-180" />
                    </summary>
                    <div className="space-y-1">
                      <Link href="/dashboard/ppic/laporan/barang-masuk" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/ppic/laporan/barang-masuk" ? "bg-purple-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"}`}>Laporan Barang Masuk</Link>
                      <Link href="/dashboard/ppic/laporan/barang-keluar" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/ppic/laporan/barang-keluar" ? "bg-purple-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"}`}>Laporan Barang Keluar</Link>
                      <Link href="/dashboard/ppic/laporan/barang-dikembalikan" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/ppic/laporan/barang-dikembalikan" ? "bg-purple-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"}`}>Laporan B. Dikembalikan</Link>
                      <Link href="/dashboard/ppic/laporan/stok-opname" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/ppic/laporan/stok-opname" ? "bg-purple-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-purple-600 hover:bg-purple-50"}`}>Laporan Stok Opname</Link>
                    </div>
                  </details>
                </div>
              </details>
            )}

            {/* Purchasing Section */}
            {isPurchasing && (
              <details className="group" open={isPurchasing}>
                <summary className="flex items-center justify-between px-4 py-3 text-gray-600 rounded-xl hover:bg-teal-50 hover:text-teal-600 cursor-pointer transition-all duration-200 list-none [&::-webkit-details-marker]:hidden border border-transparent hover:border-teal-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <span className="font-semibold">Purchasing</span>
                  </div>
                  <ChevronDown className="w-4 h-4 transition-transform group-open:-rotate-180 text-gray-400" />
                </summary>
                <div className="pl-6 pr-2 py-2 space-y-4 ml-4 border-l-2 border-teal-50 mt-1">
                  <details className="group/master" open={isPurchasing}>
                    <summary className="flex items-center justify-between text-sm font-bold text-gray-400 hover:text-teal-600 cursor-pointer list-none [&::-webkit-details-marker]:hidden uppercase tracking-wider mb-2">
                      <span>Master</span>
                      <ChevronDown className="w-3 h-3 transition-transform group-open/master:-rotate-180" />
                    </summary>
                    <div className="space-y-1">
                      <Link href="/dashboard/purchasing/master/data-barang" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/purchasing/master/data-barang" ? "bg-teal-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-teal-600 hover:bg-teal-50"}`}>Data Barang</Link>
                      <Link href="/dashboard/purchasing/master/data-supplier" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/purchasing/master/data-supplier" ? "bg-teal-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-teal-600 hover:bg-teal-50"}`}>Data Supplier</Link>
                    </div>
                  </details>
                  
                  <details className="group/laporan" open={isPurchasing}>
                    <summary className="flex items-center justify-between text-sm font-bold text-gray-400 hover:text-teal-600 cursor-pointer list-none [&::-webkit-details-marker]:hidden uppercase tracking-wider mb-2">
                      <span>Laporan</span>
                      <ChevronDown className="w-3 h-3 transition-transform group-open/laporan:-rotate-180" />
                    </summary>
                    <div className="space-y-1">
                      <Link href="/dashboard/purchasing/laporan/barang-masuk" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/purchasing/laporan/barang-masuk" ? "bg-teal-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-teal-600 hover:bg-teal-50"}`}>Rekap Data Barang Masuk</Link>
                      <Link href="/dashboard/purchasing/laporan/barang-keluar" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/purchasing/laporan/barang-keluar" ? "bg-teal-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-teal-600 hover:bg-teal-50"}`}>Rekap Data Barang Keluar</Link>
                      <Link href="/dashboard/purchasing/laporan/stok-opname" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/purchasing/laporan/stok-opname" ? "bg-teal-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-teal-600 hover:bg-teal-50"}`}>Rekap Data Stok Opname</Link>
                      <Link href="/dashboard/purchasing/laporan/pembelian" className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === "/dashboard/purchasing/laporan/pembelian" ? "bg-teal-500 text-white font-medium shadow-sm" : "text-gray-500 hover:text-teal-600 hover:bg-teal-50"}`}>Rekap Pembelian</Link>
                    </div>
                  </details>
                </div>
              </details>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-500 rounded-xl hover:bg-red-50 transition-all duration-200 group"
          >
             <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
               <LogOut className="w-4 h-4" />
             </div>
             <span className="font-semibold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
        {/* Header for Mobile/Desktop */}
        <header className="h-20 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 flex items-center justify-between px-6 z-20 sticky top-0">
          <div className="flex items-center md:hidden">
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-bold text-gray-800">DPSA Sys</span>
            </div>
          </div>
          
          <div className="hidden md:flex flex-1">
             <div className="relative w-full max-w-md">
                <input type="text" placeholder="Search anything..." className="w-full bg-gray-100/50 text-gray-700 text-sm rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"/>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end hidden md:flex">
                <span className="text-sm font-semibold text-gray-800">{userName || "User"}</span>
                <span className="text-xs text-gray-500 capitalize">{userRole?.replace('superadmin', 'Super Admin') || "Guest"}</span>
             </div>
             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shadow-inner">
               {userName?.charAt(0) || "U"}
             </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

