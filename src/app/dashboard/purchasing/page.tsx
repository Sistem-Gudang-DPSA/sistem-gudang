import React from 'react';
import { ShoppingCart, FileText, CheckCircle2, TrendingDown } from 'lucide-react';

export default function PurchasingDashboard() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">Purchasing Dashboard</h1>
        <p className="text-gray-500">Manage procurements, purchase orders, and supplier relationships.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6" />
             </div>
             <div>
                <p className="text-sm font-medium text-gray-500">Active POs</p>
                <h3 className="text-2xl font-bold text-gray-800">128</h3>
             </div>
          </div>
          <p className="text-xs text-gray-500">12 pending approval</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
             </div>
             <div>
                <p className="text-sm font-medium text-gray-500">RFQs Sent</p>
                <h3 className="text-2xl font-bold text-gray-800">45</h3>
             </div>
          </div>
          <p className="text-xs text-gray-500">This month</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
             </div>
             <div>
                <p className="text-sm font-medium text-gray-500">Order Fulfillment</p>
                <h3 className="text-2xl font-bold text-gray-800">92%</h3>
             </div>
          </div>
          <p className="text-xs text-green-600 font-medium">+3% from last quarter</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <TrendingDown className="w-6 h-6" />
             </div>
             <div>
                <p className="text-sm font-medium text-gray-500">Cost Savings</p>
                <h3 className="text-2xl font-bold text-gray-800">Rp 12.5M</h3>
             </div>
          </div>
          <p className="text-xs text-gray-500">YTD accumulated</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
         <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">Recent Purchase Orders</h2>
            <div className="flex gap-2">
               <button className="text-sm font-medium text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">Filter</button>
               <button className="text-sm font-medium text-white bg-teal-600 px-3 py-1.5 rounded-lg hover:bg-teal-700 shadow-sm">New PO</button>
            </div>
         </div>
         <div className="p-6">
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm text-gray-500">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 rounded-lg">
                     <tr>
                        <th className="px-4 py-3 rounded-tl-lg">PO Number</th>
                        <th className="px-4 py-3">Supplier</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Expected Delivery</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">PO-2026-0041</td>
                        <td className="px-4 py-3 text-gray-800 font-medium flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-gray-200 text-xs flex items-center justify-center font-bold text-gray-500">SJ</div>
                          PT Sumber Jati
                        </td>
                        <td className="px-4 py-3">Rp 45.000.000</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-bold">Processing</span></td>
                        <td className="px-4 py-3">22 Apr 2026</td>
                     </tr>
                     <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">PO-2026-0040</td>
                        <td className="px-4 py-3 text-gray-800 font-medium flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-gray-200 text-xs flex items-center justify-center font-bold text-gray-500">MA</div>
                          Makmur Accessories
                        </td>
                        <td className="px-4 py-3">Rp 12.500.000</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-bold">Completed</span></td>
                        <td className="px-4 py-3">18 Apr 2026</td>
                     </tr>
                     <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">PO-2026-0039</td>
                        <td className="px-4 py-3 text-gray-800 font-medium flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-gray-200 text-xs flex items-center justify-center font-bold text-gray-500">CP</div>
                          CV Citra Propan
                        </td>
                        <td className="px-4 py-3">Rp 8.900.000</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-xs font-bold">Waiting Approval</span></td>
                        <td className="px-4 py-3">25 Apr 2026</td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  );
}
