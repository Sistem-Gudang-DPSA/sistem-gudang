"use client";

import React, { useState } from 'react';
import { Search, Plus, Download, Edit2, Trash2, Filter, MoreHorizontal } from 'lucide-react';

export default function DataBarangPurchasing() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock Data
  const [dataBarang, setDataBarang] = useState([
    { id: 1, kode: 'T3-LBR-001-A01', nama: 'Triplex 3mm', supplier: 'Sumber Jaya', stok: 100, satuan: 'Lembar', kategori: 'Lembaran', harga: '55.000', lokasi: 'A04', status: 'In Stock', tanggal: '2024-04-20' },
    { id: 2, kode: 'KY-JTI-012-B02', nama: 'Kayu Jati Grade A', supplier: 'PT Rimba Makmur', stok: 45, satuan: 'Batang', kategori: 'Kayu Solid', harga: '120.000', lokasi: 'B02', status: 'Low Stock', tanggal: '2024-04-21' },
    { id: 3, kode: 'BSI-HLW-044-C01', nama: 'Besi Hollow 4x4', supplier: 'Baja Sentosa', stok: 200, satuan: 'Batang', kategori: 'Logam', harga: '85.000', lokasi: 'C01', status: 'In Stock', tanggal: '2024-04-22' },
    { id: 4, kode: 'CT-PPU-010-D05', nama: 'Cat Polyurethane 5L', supplier: 'CV Warna Agung', stok: 12, satuan: 'Kaleng', kategori: 'Finishing', harga: '350.000', lokasi: 'D05', status: 'Critical', tanggal: '2024-04-23' },
    { id: 5, kode: 'SKP-KAY-008-E01', nama: 'Sekrup Kayu 5cm', supplier: 'Toko Baut Jaya', stok: 1500, satuan: 'Pcs', kategori: 'Aksesoris', harga: '250', lokasi: 'E01', status: 'In Stock', tanggal: '2024-04-24' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState('');

  const [formData, setFormData] = useState({ supplier: '', harga: '' });
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleSimpan = () => {
    if (!formData.supplier || !formData.harga) {
      alert('Mohon lengkapi semua data!');
      return;
    }

    if (editingId) {
      setDataBarang(dataBarang.map(item => 
        item.id === editingId ? { ...item, supplier: formData.supplier, harga: formData.harga } : item
      ));
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ supplier: '', harga: '' });
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({ supplier: item.supplier, harga: item.harga });
    setIsModalOpen(true);
  };

  const handleHapus = (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      setDataBarang(dataBarang.filter(item => item.id !== id));
    }
  };

  const handleExportCSV = () => {
    const headers = ['No,Kode Barang,Nama Barang,Supplier,Jumlah Stok,Satuan,Kategori,Harga,Lokasi,Status,Tanggal'];
    const csvData = dataBarang.map((item, index) => 
      `${index + 1},${item.kode},"${item.nama}","${item.supplier}",${item.stok},${item.satuan},${item.kategori},"${item.harga}",${item.lokasi},${item.status},${item.tanggal}`
    );
    const csvString = [...headers, ...csvData].join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Data_Barang_Purchasing.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = dataBarang.filter(item => {
    const matchesSearch = 
      item.kode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = searchDate === '' || item.tanggal === searchDate;
    
    return matchesSearch && matchesDate;
  });

  const getCategoryColor = (kategori: string) => {
    if (!kategori) return 'bg-gray-100 text-gray-700 border-gray-200/50';
    switch(kategori.toLowerCase()) {
      case 'lembaran': return 'bg-blue-100 text-blue-700 border-blue-200/50';
      case 'kayu solid': return 'bg-amber-100 text-amber-700 border-amber-200/50';
      case 'logam': return 'bg-slate-100 text-slate-700 border-slate-200/50';
      case 'finishing': return 'bg-teal-100 text-teal-700 border-teal-200/50';
      case 'aksesoris': return 'bg-pink-100 text-pink-700 border-pink-200/50';
      default: return 'bg-purple-100 text-purple-700 border-purple-200/50';
    }
  };



  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 mb-1">Data Barang</h1>
          <p className="text-gray-500 text-sm">Kelola master data barang, material, dan stok inventaris Purchasing.</p>
        </div>
        <div className="flex items-center gap-3">
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 sm:text-sm transition-all"
                placeholder="Cari kode, nama barang, atau supplier..." 
              />
            </div>
            <div className="relative w-full sm:w-48">
              <input 
                type="date" 
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 sm:text-sm transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">

            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              title="Export Data ke CSV"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-6 py-4">No</th>
                <th scope="col" className="px-6 py-4">Informasi Barang</th>
                <th scope="col" className="px-6 py-4">Supplier</th>
                <th scope="col" className="px-6 py-4">Stok & Satuan</th>
                <th scope="col" className="px-6 py-4">Kategori</th>
                <th scope="col" className="px-6 py-4 text-right">Harga (Rp)</th>
                <th scope="col" className="px-6 py-4">Lokasi</th>
                <th scope="col" className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((item, index) => (
                <tr key={item.id} className="hover:bg-purple-50/30 transition-colors group">
                  <td className="px-6 py-4 text-gray-500">{index + 1}</td>
                  
                  {/* Informasi Barang */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900">{item.nama}</span>
                      <span className="text-xs font-mono text-gray-500 mt-0.5">{item.kode}</span>
                    </div>
                  </td>
                  
                  {/* Supplier */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {item.supplier ? item.supplier.charAt(0) : '-'}
                      </div>
                      <span>{item.supplier || '-'}</span>
                    </div>
                  </td>

                  {/* Stok & Satuan */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className={`font-bold ${item.stok < 20 ? 'text-red-600' : item.stok < 50 ? 'text-amber-600' : 'text-gray-800'}`}>
                         {item.stok}
                       </span>
                       <span className="text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded-md">{item.satuan}</span>
                    </div>
                  </td>

                  {/* Kategori */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.kategori)}`}>
                      {item.kategori || '-'}
                    </span>
                  </td>

                  {/* Harga */}
                  <td className="px-6 py-4 text-right font-mono text-gray-700">
                    {item.harga}
                  </td>

                  {/* Lokasi */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-gray-600 font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      {item.lokasi}
                    </span>
                  </td>

                  {/* Aksi */}
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleEdit(item)} 
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#FF8A00] hover:bg-orange-600 rounded-lg transition-all shadow-sm w-full max-w-[110px] mx-auto"
                    >
                       <Plus className="w-3.5 h-3.5" />
                       Lengkapi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination / Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div>
             Menampilkan <span className="font-semibold text-gray-900">1</span> sampai <span className="font-semibold text-gray-900">{filteredData.length}</span> dari <span className="font-semibold text-gray-900">{filteredData.length}</span> data
          </div>
          <div className="flex gap-1">
             <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-400 cursor-not-allowed">Sec</button>
             <button className="px-3 py-1 bg-purple-600 text-white rounded-md font-medium shadow-sm shadow-purple-500/20">1</button>
             <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-purple-600 font-medium transition-colors">2</button>
             <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-purple-600 font-medium transition-colors">3</button>
             <span className="px-2 py-1 text-gray-400">...</span>
             <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-white text-gray-600 hover:text-purple-600 font-medium transition-colors">Selanjutnya</button>
          </div>
        </div>
      </div>



      {/* Modal Tambah Data */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6 uppercase tracking-wide">DATA BARANG</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2 font-sans">Suplier</label>
                <input 
                  type="text" 
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  placeholder="Masukan nama suplier" 
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors font-sans" 
                />
              </div>
              
              <div>
                <label className="block text-[15px] font-medium text-gray-800 mb-2 font-sans">Harga</label>
                <input 
                  type="text" 
                  value={formData.harga}
                  onChange={(e) => setFormData({...formData, harga: e.target.value})}
                  placeholder="Masukan Jumlah" 
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors font-sans" 
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-2">
              <button 
                onClick={() => { setIsModalOpen(false); setEditingId(null); }} 
                className="px-8 py-2.5 border-2 border-[#FF8A00] text-[#FF8A00] font-semibold rounded-lg hover:bg-orange-50 transition-colors font-sans"
              >
                Batal
              </button>
              <button 
                onClick={handleSimpan} 
                className="px-8 py-2.5 bg-[#FF8A00] text-white font-semibold rounded-lg hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-colors font-sans"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
