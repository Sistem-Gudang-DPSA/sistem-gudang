"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import Pagination from "@/shared/components/Pagination";
import { listChecklistDokubah } from "@/domains/inventory/api";
import { useApiData } from "@/shared/lib/use-api-data";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";

const PAGE_SIZE = 20;

export default function CeklistDokubahPage() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const [page, setPage] = useState(1);

  const { data: loaded } = useApiData(
    () => listChecklistDokubah({ page, pageSize: PAGE_SIZE, search: debouncedQuery || undefined }),
    `${debouncedQuery}|${page}`,
    "Gagal memuat data checklist Dokubah.",
  );
  const pageRows = loaded?.rows ?? [];
  const total = loaded?.total ?? 0;

  return (
    <main className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <h1 className="text-[18px] font-extrabold text-black tracking-wide uppercase mb-4">
        Daftar Checklist Dokubah
      </h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Silahkan cari data"
              aria-label="Cari checklist Dokubah"
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4 w-20">No.</th>
                <th scope="col" className="px-6 py-4">Kode Dokubah</th>
                <th scope="col" className="px-6 py-4">Nama Client</th>
                <th scope="col" className="px-6 py-4">Nama Item/Proyek</th>
                <th scope="col" className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pageRows.length > 0 ? (
                pageRows.map((row, index) => {
                  const no = (page - 1) * PAGE_SIZE + index + 1;
                  return (
                    <tr
                      key={row.dokubahId}
                      className={`transition-colors hover:bg-[#FF8A00]/5 ${no % 2 === 0 ? "bg-gray-50/60" : "bg-white"}`}
                    >
                      <td className="px-6 py-4 text-gray-500">{no}.</td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{row.kodeDokubah}</td>
                      <td className="px-6 py-4 text-gray-900">{row.namaClient}</td>
                      <td className="px-6 py-4 text-gray-600">{row.namaItem}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          {/* Membuka halaman Checklist Dokubah: [alamat halaman ini]/[id] */}
                          <Link
                            href={`${pathname}/${row.dokubahId}`}
                            className="inline-block px-4 py-1.5 bg-[#FF8A00] text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            Detail
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">
                    Data checklist Dokubah tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>
    </main>
  );
}