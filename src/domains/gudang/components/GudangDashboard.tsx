import React from 'react';
import { Package, ArrowUpRight, ArrowDownRight, AlertTriangle, Layers } from 'lucide-react';

export default function GudangDashboard() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Gudang Dashboard</h1>
        <p className="text-gray-500">Manage your warehouse inventory, incoming goods, and stock movements.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Layers className="w-6 h-6" />
             </div>
             <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-bold">+2.4%</span>
          </div>
          <p className="text-sm font-medium text-gray-500">Total Stock Items</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">12,450</h3>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <ArrowDownRight className="w-6 h-6" />
             </div>
          </div>
          <p className="text-sm font-medium text-gray-500">Inbound Today</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">340</h3>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6" />
             </div>
          </div>
          <p className="text-sm font-medium text-gray-500">Outbound Today</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">1,204</h3>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-200 bg-red-50/50">
          <div className="flex justify-between items-start mb-4">
             <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
             </div>
             <span className="bg-red-200 text-red-800 px-2 py-1 rounded-md text-xs font-bold">Action Needed</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
          <h3 className="text-2xl font-bold text-red-700 mt-1">18</h3>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">Recent Movements</h2>
            <button className="text-sm font-semibold text-blue-600 hover:text-blue-800">View All</button>
         </div>
         <div className="p-6">
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 rounded-lg">
                     <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Item ID</th>
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 rounded-tr-lg">Date</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">ITM-0492</td>
                        <td className="px-4 py-3">Kayu Jati Grade A</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-bold">Inbound</span></td>
                        <td className="px-4 py-3">+ 500 pcs</td>
                        <td className="px-4 py-3"><span className="text-green-600 font-medium flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>Completed</span></td>
                        <td className="px-4 py-3">Just now</td>
                     </tr>
                     <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">ITM-0211</td>
                        <td className="px-4 py-3">Besi Hollow 4x4</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-bold">Outbound</span></td>
                        <td className="px-4 py-3">- 120 pcs</td>
                        <td className="px-4 py-3"><span className="text-green-600 font-medium flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div>Completed</span></td>
                        <td className="px-4 py-3">2 hours ago</td>
                     </tr>
                     <tr className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">ITM-0833</td>
                        <td className="px-4 py-3">Cat Kayu Propan</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-bold">Inbound</span></td>
                        <td className="px-4 py-3">+ 50 kaleng</td>
                        <td className="px-4 py-3"><span className="text-amber-600 font-medium flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div>Pending</span></td>
                        <td className="px-4 py-3">4 hours ago</td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
}
