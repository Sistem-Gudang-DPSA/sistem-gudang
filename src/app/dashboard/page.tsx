import React from 'react';
import { PackageSearch, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverview() {
  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Welcome back, Admin! 👋</h1>
        <p className="text-gray-500">Here&apos;s an overview of the DPSA integrated system today.</p>
      </div>

      {/* Grid Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <PackageSearch className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Active Items</p>
            <h3 className="text-2xl font-bold text-gray-800">1,245</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-7 h-7 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Production Rate</p>
            <h3 className="text-2xl font-bold text-gray-800">89%</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
            <Users className="w-7 h-7 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Active Suppliers</p>
            <h3 className="text-2xl font-bold text-gray-800">112</h3>
          </div>
        </div>
      </div>

      {/* Roles Portals */}
      <h2 className="text-xl font-bold text-gray-800 mb-6">Division Portals</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gudang Portal */}
        <Link href="/dashboard/gudang" className="group block relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-400 to-red-500 p-8 text-white shadow-lg shadow-orange-500/20 hover:-translate-y-1 transition-all duration-300">
           <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
           <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-2">Gudang</h3>
              <p className="text-white/80 font-medium mb-6">Warehouse & Inventory Control</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-white group-hover:gap-3 transition-all">
                 Enter Portal <span>&rarr;</span>
              </div>
           </div>
        </Link>

        {/* PPIC Portal */}
        <Link href="/dashboard/ppic" className="group block relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white shadow-lg shadow-purple-500/20 hover:-translate-y-1 transition-all duration-300">
           <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
           <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-2">PPIC</h3>
              <p className="text-white/80 font-medium mb-6">Production Planning & Control</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-white group-hover:gap-3 transition-all">
                 Enter Portal <span>&rarr;</span>
              </div>
           </div>
        </Link>
        
        {/* Purchasing Portal */}
        <Link href="/dashboard/purchasing" className="group block relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-400 to-emerald-600 p-8 text-white shadow-lg shadow-teal-500/20 hover:-translate-y-1 transition-all duration-300">
           <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
           <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-2">Purchasing</h3>
              <p className="text-white/80 font-medium mb-6">Procurement & Order Mgmt</p>
              <div className="flex items-center gap-2 text-sm font-semibold text-white group-hover:gap-3 transition-all">
                 Enter Portal <span>&rarr;</span>
              </div>
           </div>
        </Link>
      </div>

    </div>
  );
}
