import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-center p-6">
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
        <SearchX className="w-10 h-10 text-blue-600" />
      </div>
      <p className="text-sm font-semibold text-blue-600 tracking-widest mb-2">404</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Halaman Tidak Ditemukan</h1>
      <p className="text-gray-500 max-w-md mb-8">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
