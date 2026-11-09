"use client";

import React from "react";
import Link from "next/link";
import { 
  Warehouse, PackageCheck, UserCog, ShoppingCart,
  Users, ArrowRight, UserPlus
} from "lucide-react";
import { listUsers } from "../api";
import { useApiData } from "@/shared/lib/use-api-data";

const divisions = [
  { 
    name: "Gudang", 
    path: "/dashboard/gudang", 
    icon: Warehouse,
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-50",
    description: "Manajemen stok, barang masuk/keluar, dan inventori."
  },
  {
    name: "Gudang Barang Jadi",
    path: "/dashboard/gudang-barang-jadi",
    icon: PackageCheck,
    color: "from-rose-500 to-pink-500",
    bgColor: "bg-rose-50",
    description: "Penyimpanan barang jadi hasil produksi, barang masuk/keluar, dan stok opname."
  },
  { 
    name: "PPIC", 
    path: "/dashboard/ppic", 
    icon: UserCog, 
    color: "from-purple-500 to-indigo-500", 
    bgColor: "bg-purple-50",
    description: "Perencanaan produksi, kontrol inventori, dan dokubah." 
  },
  { 
    name: "Purchasing", 
    path: "/dashboard/purchasing", 
    icon: ShoppingCart, 
    color: "from-teal-500 to-emerald-500", 
    bgColor: "bg-teal-50",
    description: "Pengadaan barang, manajemen supplier, dan penawaran harga." 
  },
];

export default function SuperAdminDashboard() {
  const { data: users, loading, error } = useApiData(
    () => listUsers({ pageSize: 10 }),
    "dashboard-users",
    "Gagal memuat daftar user.",
  );
  const members = users?.rows ?? [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Super Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Kontrol penuh sistem dan manajemen akses pengguna.</p>
        </div>
        <Link 
          href="/dashboard/superadmin/users"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
        >
          <UserPlus className="w-5 h-5" />
          Kelola Data User
        </Link>
      </div>

      {/* Division Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {divisions.map((div) => {
          const Icon = div.icon;
          return (
            <Link 
              key={div.name} 
              href={div.path}
              className="group relative bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${div.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                <Icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{div.name} Dashboard</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                {div.description}
              </p>
              <div className="flex items-center text-blue-600 font-bold text-sm">
                Lihat Selengkapnya
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Member Management Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Daftar User</h2>
          </div>
          <Link
            href="/dashboard/superadmin/users"
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Lihat Semua ({users?.total ?? 0})
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && error && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-red-500">{error}</td></tr>
              )}
              {!loading && !error && members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-gray-700">{member.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                      {member.roleName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{member.email}</td>
                </tr>
              ))}
              {!loading && !error && members.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-400 italic">Belum ada user.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
