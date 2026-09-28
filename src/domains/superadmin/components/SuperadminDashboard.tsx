"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Package, UserCog, ShoppingCart, ShieldCheck, 
  Plus, Users, ArrowRight, UserPlus, Trash2, Edit2,
  CheckCircle2, AlertCircle
} from "lucide-react";

const divisions = [
  { 
    name: "Gudang", 
    path: "/dashboard/gudang", 
    icon: Package, 
    color: "from-orange-500 to-red-500", 
    bgColor: "bg-orange-50",
    description: "Manajemen stok, barang masuk/keluar, dan inventori." 
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

const mockMembers = [
  { id: 1, name: "Andi Saputra", role: "gudang", email: "andi@dpsa.com", status: "Active" },
  { id: 2, name: "Budi Santoso", role: "ppic", email: "budi@dpsa.com", status: "Active" },
  { id: 3, name: "Citra Lestari", role: "purchasing", email: "citra@dpsa.com", status: "Active" },
];

export default function SuperAdminDashboard() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", role: "gudang", password: "" });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would be an API call
    alert(`Member ${newMember.name} added as ${newMember.role}!`);
    setShowAddModal(false);
    setNewMember({ name: "", role: "gudang", password: "" });
  };

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {divisions.map((div) => {
          const Icon = div.icon;
          return (
            <Link 
              key={div.name} 
              href={div.path}
              className="group relative bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${div.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
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
            <h2 className="text-lg font-bold text-gray-800">Daftar Member Aktif</h2>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">Export CSV</button>
            <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Lihat Semua</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-700">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                      member.role === 'gudang' ? 'bg-orange-100 text-orange-600' :
                      member.role === 'ppic' ? 'bg-purple-100 text-purple-600' :
                      'bg-teal-100 text-teal-600'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{member.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-medium text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      {member.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">Tambah Member</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Masukkan nama..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    value={newMember.name}
                    onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Role Akses</label>
                  <select 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all appearance-none"
                    value={newMember.role}
                    onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                  >
                    <option value="gudang">Gudang</option>
                    <option value="ppic">PPIC</option>
                    <option value="purchasing">Purchasing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Password Default</label>
                  <input 
                    type="password" 
                    required
                    placeholder="Minimal 6 karakter..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    value={newMember.password}
                    onChange={(e) => setNewMember({...newMember, password: e.target.value})}
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    Simpan Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
