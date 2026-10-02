"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { login, dashboardPathFor, refreshSession, safeNextPath } from "@/domains/auth/api";
import { ApiError } from "@/shared/lib/api-client";

// Page the user was sent away from (set by the dashboard layout), if it is a safe dashboard path.
const nextPath = () => safeNextPath(new URLSearchParams(window.location.search).get("next"));

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    refreshSession()
      .then((user) => {
        // Sesi dari tab/kunjungan sebelumnya masih valid, jangan tampilkan form
        // login lagi. Login ulang di sini akan merotasi refresh token backend
        // dan mencabut sesi yang sedang aktif itu.
        router.replace(nextPath() ?? dashboardPathFor(user));
      })
      .catch(() => setCheckingSession(false));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(email, password);
      router.push(nextPath() ?? dashboardPathFor(user));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tidak bisa menghubungi server.");
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
            <p className="text-slate-500">Silakan masukkan email dan password Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Input Fields */}
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  maxLength={191}
                  required
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 text-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  maxLength={100}
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
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-blue-600 transition-colors">
              Lupa password? Hubungi IT Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}


