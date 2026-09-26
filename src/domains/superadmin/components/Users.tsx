"use client";

import React, { useState, useEffect } from "react";
import {
  Users, UserPlus, ShieldCheck,
  UserCog, Package, ShoppingCart, Search,
  AlertCircle, X, Edit2, Trash2
} from "lucide-react";
import { createUser, deleteUser, listRoles, listUsers, updateUser } from "@/domains/superadmin/api";
import type { Role, UserAccount } from "@/domains/superadmin/types";
import { ApiError } from "@/shared/lib/api-client";

const emptyForm = { username: "", email: "", password: "", roleId: "" };

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = async (search: string) => {
    setLoading(true);
    try {
      const result = await listUsers({ search: search || undefined });
      setUsers(result.rows);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Gagal memuat data user.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    listRoles().then(setRoles).catch(() => {});
  }, []);

  const handleMulaiTambah = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setError("");
    setShowModal(true);
  };

  const handleEdit = (user: UserAccount) => {
    setEditingId(user.id);
    setFormData({ username: user.username, email: user.email, password: "", roleId: String(user.roleId) });
    setError("");
    setShowModal(true);
  };

  const handleDelete = async (user: UserAccount) => {
    if (!window.confirm(`Hapus user ${user.username}?`)) return;
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Gagal menghapus user.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.username || !formData.email || !formData.roleId || (!editingId && !formData.password)) {
      setError("Lengkapi semua data.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const updated = await updateUser(editingId, {
          username: formData.username,
          email: formData.email,
          roleId: Number(formData.roleId),
          ...(formData.password ? { password: formData.password } : {}),
        });
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        await createUser({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          roleId: Number(formData.roleId),
        });
        await loadUsers(searchTerm);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(emptyForm);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan user.");
    } finally {
      setSaving(false);
    }
  };

  const getRoleIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "superadmin": return <ShieldCheck className="w-4 h-4" />;
      case "ppic": return <UserCog className="w-4 h-4" />;
      case "gudang": return <Package className="w-4 h-4" />;
      case "purchasing": return <ShoppingCart className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleColor = (name: string) => {
    switch (name.toLowerCase()) {
      case "superadmin": return "bg-blue-100 text-blue-600";
      case "ppic": return "bg-purple-100 text-purple-600";
      case "gudang": return "bg-orange-100 text-orange-600";
      case "purchasing": return "bg-teal-100 text-teal-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Kelola Data User</h1>
          <p className="text-gray-500 text-sm mt-1">Manajemen akun pengguna dan hak akses sistem.</p>
        </div>
        <button
          onClick={handleMulaiTambah}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Tambah User Baru
        </button>
      </div>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Cari username, email, atau role..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total User</span>
          <span className="text-xl font-black text-blue-600">{users.length}</span>
        </div>
      </div>

      {loadError && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{loadError}</div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Username & Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Dibuat</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Tidak ada data user ditemukan.
                  </td>
                </tr>
              )}
              {!loading && users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${getRoleColor(user.roleName)} flex items-center justify-center font-bold text-xs`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{user.username}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${getRoleColor(user.roleName)}`}>
                      {getRoleIcon(user.roleName)}
                      {user.roleName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">{user.createdAt ?? '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Hapus user"
                      >
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">{editingId ? "Edit User" : "Tambah User Baru"}</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Username</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    placeholder="johndoe"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Password {editingId && <span className="font-normal">(kosongkan kalau tidak diubah)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingId}
                    minLength={8}
                    placeholder="Min. 8 karakter"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Role Akses</label>
                  <div className="grid grid-cols-2 gap-2">
                    {roles.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setFormData({...formData, roleId: String(r.id)})}
                        className={`px-3 py-2 rounded-xl text-xs font-bold capitalize border-2 transition-all ${
                          formData.roleId === String(r.id)
                            ? "bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                    {roles.length === 0 && (
                      <p className="col-span-2 text-xs text-gray-400">Memuat daftar role...</p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all text-sm disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan Akun User"}
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
