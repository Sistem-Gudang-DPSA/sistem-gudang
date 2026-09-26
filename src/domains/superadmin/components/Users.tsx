"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Trash2, Edit2, ShieldCheck, 
  UserCog, Package, ShoppingCart, Search, Plus,
  CheckCircle2, AlertCircle, X, Eye, EyeOff
} from "lucide-react";

interface UserAccount {
  username: string;
  password: string;
  role: string;
  name: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  
  const [formData, setFormData] = useState<UserAccount>({
    username: "",
    password: "",
    role: "gudang",
    name: ""
  });

  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const savedUsers = localStorage.getItem("app_users");
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (users.some(u => u.username === formData.username)) {
      setError("Username sudah digunakan.");
      return;
    }

    const updatedUsers = [...users, formData];
    localStorage.setItem("app_users", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    setShowModal(false);
    setFormData({ username: "", password: "", role: "gudang", name: "" });
  };

  const handleDeleteUser = (username: string) => {
    if (username === "admin") {
      alert("Akun admin utama tidak dapat dihapus.");
      return;
    }

    if (window.confirm(`Hapus user ${username}?`)) {
      const updatedUsers = users.filter(u => u.username !== username);
      localStorage.setItem("app_users", JSON.stringify(updatedUsers));
      setUsers(updatedUsers);
    }
  };

  const togglePassword = (username: string) => {
    setShowPassword(prev => ({ ...prev, [username]: !prev[username] }));
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "superadmin": return <ShieldCheck className="w-4 h-4" />;
      case "ppic": return <UserCog className="w-4 h-4" />;
      case "gudang": return <Package className="w-4 h-4" />;
      case "purchasing": return <ShoppingCart className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
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
          onClick={() => setShowModal(true)}
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
            placeholder="Cari username, nama, atau role..."
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

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">User & Nama</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Password</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredUsers.map((user) => (
                <tr key={user.username} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${getRoleColor(user.role)} flex items-center justify-center font-bold text-xs`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">{user.username}</div>
                        <div className="text-xs text-gray-500">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      {user.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                        {showPassword[user.username] ? user.password : "••••••••"}
                      </code>
                      <button 
                        onClick={() => togglePassword(user.username)}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        {showPassword[user.username] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDeleteUser(user.username)}
                      className={`p-2 text-gray-300 hover:text-red-600 transition-colors ${user.username === 'admin' ? 'invisible' : ''}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    Tidak ada data user ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
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
                  <h3 className="text-lg font-bold text-gray-800">Tambah User Baru</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: John Doe"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Username</label>
                    <input 
                      type="text" 
                      required
                      placeholder="johndoe"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
                    <input 
                      type="password" 
                      required
                      placeholder="Min. 6 karakter"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Role Akses</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["superadmin", "ppic", "gudang", "purchasing"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormData({...formData, role: r})}
                        className={`px-3 py-2 rounded-xl text-xs font-bold capitalize border-2 transition-all ${
                          formData.role === r 
                            ? "bg-blue-50 border-blue-500 text-blue-600" 
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
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
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all text-sm"
                  >
                    Simpan Akun User
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
