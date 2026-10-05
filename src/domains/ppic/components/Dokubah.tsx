"use client";

import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2, CheckCircle, XCircle, Clock, Download, Calendar } from 'lucide-react';

export default function DokubahPPIC() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const dataDokubah = [
    { id: 1, client: 'PT Bintang Raya', spk: 'SPK-2026-001', noRekap: 'RKP/04/001', approval: 'Approved' },
    { id: 2, client: 'CV Indo Makmur', spk: 'SPK-2026-002', noRekap: 'RKP/04/002', approval: 'Pending' },
    { id: 3, client: 'Global Mas', spk: 'SPK-2026-003', noRekap: 'RKP/04/003', approval: 'Rejected' },
  ];

  const filteredData = dataDokubah.filter(item => {
    if (searchQuery === "" && filterMonth === "" && filterYear === "") return true;

    const searches = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === "" || 
      item.client.toLowerCase().includes(searches) ||
      item.spk.toLowerCase().includes(searches) ||
      item.noRekap.toLowerCase().includes(searches);

    // Scan Month in noRekap (format RKP/04/001)
    const matchesMonth = filterMonth === "" || item.noRekap.split('/')[1] === filterMonth;
    
    // Scan Year in spk (format SPK-2026-001)
    const matchesYear = filterYear === "" || item.spk.includes(filterYear);

    return matchesSearch && matchesMonth && matchesYear;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col justify-start mb-8 gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1 uppercase">DOKUBAH</h1>
        <p className="text-gray-500 text-sm">Pengajuan dan pemantauan dokumen perubahan (Dokubah) per SPK / proyek.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xl">
              <input
                type="text"
                value={searchQuery}
                maxLength={100}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8A00]/20 focus:border-[#FF8A00] sm:text-sm transition-all shadow-sm"
                placeholder="Cari No. SPK / Proyek atau nama client..."
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <button
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 border rounded-xl text-sm font-semibold shadow-sm transition-all shrink-0 ${
                showFilter || isFilterActive
                  ? 'border-[#FF8A00] text-[#FF8A00] bg-orange-50'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <Funnel className="w-4 h-4" />
              <span>Filter</span>
              {isFilterActive && <span className="w-2 h-2 rounded-full bg-[#FF8A00]" />}
            </button>
          </div>

          {showFilter && (
            <div className="flex flex-wrap items-end gap-4 p-4 bg-white border border-gray-200 rounded-xl">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as StatusDokubah | '')}
                  className={`${filterInputClass} cursor-pointer`}
                >
                  <option value="">Semua Status</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Mulai</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={filterDari} onChange={(e) => setFilterDari(e.target.value)} className={filterInputClass} aria-label="Tanggal mulai dari" />
                  <span className="text-xs text-gray-500">s/d</span>
                  <input type="date" value={filterSampai} onChange={(e) => setFilterSampai(e.target.value)} className={filterInputClass} aria-label="Tanggal mulai sampai" />
                </div>
              </div>

              {isFilterActive && (
                <button onClick={resetFilter} className="text-xs text-orange-600 font-bold hover:underline pb-2.5">
                  Reset
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
            {checkedRows.length > 0 && (
              <p className="text-xs text-gray-500 sm:mr-auto">
                {checkedRows.length} data dicentang — Export &amp; Print hanya untuk data yang dicentang.
              </p>
            )}
            <div className="flex gap-2 items-end m-2 print:hidden">
                <ExportExcellButton onClick={handleExportExcel} />
                <PrintPdfButton onClick={handlePrintPdf} />
                {canCreate && (
                  <Link href={buat_dokubah_path} className={orangeButtonClass}>
                    <Plus className="w-4 h-4" />
                    <span>Buat Dokubah</span>
                  </Link>
                )}
            </div>
          </div>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="bg-gray-100 text-gray-700 font-semibold">
              <tr>
                <th scope="col" className={`${cellClass} w-14 text-center`}>No.</th>
                <th scope="col" className={cellClass}>No. SPK / Proyek</th>
                <th scope="col" className={cellClass}>Nama Client</th>
                <th scope="col" className={cellClass}>Tanggal Mulai</th>
                <th scope="col" className={cellClass}>Tanggal Selesai</th>
                <th scope="col" className={cellClass}>Status</th>
                <th scope="col" className={`${cellClass} text-center`}>Aksi</th>
                <th scope="col" className={`${lastCellClass} text-center`}>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <span>Check</span>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      disabled={filteredData.length === 0}
                      aria-label="Centang semua"
                      className={checkboxClass}
                    />
                  </label>
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {filteredData.map((item, index) => (
                <tr
                  key={item.id}
                  className={`transition-colors ${selectedIds.has(item.id) ? 'bg-orange-50/60' : 'hover:bg-orange-50/20'}`}
                >
                  <td className={`${cellClass} text-center text-gray-700`}>{index + 1}</td>
                  <td className={`${cellClass} font-semibold text-gray-900`}>{item.noSpk}</td>
                  <td className={cellClass}>{item.client}</td>
                  <td className={cellClass}>{formatTanggal(item.tanggalMulai)}</td>
                  <td className={cellClass}>{formatTanggal(item.tanggalSelesai)}</td>
                  <td className={cellClass}>{getStatusBadge(item.status)}</td>
                  {item.status === 'Approved' && (
                    <td className={`${cellClass} text-center`}>
                    <Link
                      href={viewDokubahPath(item.id)}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded border border-blue-200 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                  </td>
                  )}
                  {item.status !== 'Approved' && (
                    <td className={`${cellClass} text-center`}>
                      <span className="flex flex-col sm:flex-row items-center justify-center gap-2">
                        <Link 
                          href={`${editMaterialPath(item.id)}?from=dokubah`}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#FF8A00]/10 text-[#FF8A00] text-xs font-bold rounded-lg hover:bg-[#FF8A00]/20 transition-all duration-200 opacity-90 group-hover:opacity-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" strokeWidth={2.5}/>
                            Edit
                        </Link>
                        <Link
                          href={viewDokubahPath(item.id)}
                          className="flex-1 lg:flex-none flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded border border-blue-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                      </span>
                    </td>
                  )}
                  <td className={`${lastCellClass} text-center`}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                      aria-label={`Centang ${item.noSpk}`}
                      className={checkboxClass}
                    />
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400 italic border-b border-gray-200">
                    {loading ? 'Memuat data...' : error || 'Data tidak ditemukan.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
      </div>
    </div>
  );
}
