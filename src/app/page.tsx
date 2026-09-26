"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Package, ShieldCheck, UserCog, ShoppingCart, Lock, User, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Initialize default users if not exists
  useEffect(() => {
    const existingUsers = localStorage.getItem("app_users");
    if (!existingUsers) {
      const defaultUsers = [
        { username: "admin", password: "admin123", role: "superadmin", name: "Super Admin" },
        { username: "ppic1", password: "ppic123", role: "ppic", name: "PPIC User 1" },
        { username: "gudang1", password: "gudang123", role: "gudang", name: "Gudang User 1" },
        { username: "purchase1", password: "purchasing123", role: "purchasing", name: "Purchasing User 1" },
      ];
      localStorage.setItem("app_users", JSON.stringify(defaultUsers));
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate API delay
    setTimeout(() => {
      const usersJson = localStorage.getItem("app_users");
      const users = usersJson ? JSON.parse(usersJson) : [];
      
      const foundUser = users.find(
        (u: any) => u.username === username && u.password === password
      );

      if (foundUser) {
        localStorage.setItem("userRole", foundUser.role);
        localStorage.setItem("userName", foundUser.name);
        localStorage.setItem("currentUser", foundUser.username);
        
        if (foundUser.role === "superadmin") {
          router.push("/dashboard/superadmin");
        } else {
          router.push(`/dashboard/${foundUser.role}`);
        }
      } else {
        setError("Username atau Password salah.");
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Left Side: Illustration & Welcome */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-700 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">DPSA Sys</h2>
          </div>

          <div>
            <h1 className="text-4xl font-extrabold mb-6 leading-tight">
              Sistem Manajemen <br /> Gudang Terintegrasi
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed mb-8">
              Kelola stok, transaksi, dan laporan dengan efisien dalam satu platform yang aman dan handal.
            </p>
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-500 bg-indigo-400 flex items-center justify-center text-xs font-bold">
                  U{i}
                </div>
              ))}
              <div className="pl-6 text-sm text-blue-200 flex items-center">
                Dipercaya oleh 50+ tim produksi
              </div>
            </div>
          </div>

          <div className="text-sm text-blue-300">
            &copy; 2026 PT DPSA Group. All rights reserved.
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Selamat Datang</h2>
            <p className="text-slate-500">Silakan masukkan username dan password Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Input Fields */}
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2 animate-shake">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-blue-500/30 transition-all active:scale-95 ${
                loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Login Sekarang
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-8">
             <div className="bg-slate-50 p-4 rounded-xl text-xs text-left">
                <p className="font-bold text-slate-600 mb-2">Akun Demo:</p>
                <div className="grid grid-cols-2 gap-2 text-slate-500">
                   <span>Admin: admin / admin123</span>
                   <span>PPIC: ppic1 / ppic123</span>
                   <span>Gudang: gudang1 / gudang123</span>
                   <span>Purchasing: purchase1 / purchasing123</span>
                </div>
             </div>
          </div>

          <div className="mt-8 text-center">
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-blue-600 transition-colors">
              Lupa password? Hubungi IT Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


