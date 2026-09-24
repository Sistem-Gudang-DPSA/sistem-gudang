import React from 'react';
import { CalendarClock, FileWarning, Factory, BarChart3, Layers } from 'lucide-react';

export default function PPICDashboard() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">PPIC Dashboard</h1>
        <p className="text-gray-500">Monitor production planning, material requirements, and factory schedules.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <Factory className="w-6 h-6" />
             </div>
             <div>
                <p className="text-sm font-medium text-gray-500">Active Work Orders</p>
                <h3 className="text-2xl font-bold text-gray-800">42</h3>
             </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: '70%' }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">70% capacity reached</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <CalendarClock className="w-6 h-6" />
             </div>
             <div>
                <p className="text-sm font-medium text-gray-500">On-Time Delivery</p>
                <h3 className="text-2xl font-bold text-gray-800">94.2%</h3>
             </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '94%' }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Target: 95%</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
             </div>
             <div>
                <p className="text-sm font-medium text-gray-500">Production Yield</p>
                <h3 className="text-2xl font-bold text-gray-800">98.5%</h3>
             </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '98%' }}></div>
          </div>
          <p className="text-xs text-green-600 mt-2 font-medium">+1.2% from last week</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200 bg-amber-50/30">
          <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <FileWarning className="w-6 h-6" />
             </div>
             <div>
                <p className="text-sm font-medium text-gray-500">Material Shortages</p>
                <h3 className="text-2xl font-bold text-amber-700">3</h3>
             </div>
          </div>
           <button className="w-full mt-2 py-1.5 px-3 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-lg transition-colors">
              Review Shortages
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Schedule */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">Production Schedule</h2>
            <button className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-md">See full calendar</button>
          </div>
          
          <div className="space-y-4">
             {/* Timeline Item */}
             <div className="relative pl-6 pb-4 border-l-2 border-purple-200 last:border-0 last:pb-0">
                <div className="absolute -left-1.5 top-0 w-3 h-3 bg-purple-600 rounded-full ring-4 ring-white"></div>
                <h4 className="text-sm font-bold text-gray-800">PO-23491 (Sofa Minimalis)</h4>
                <p className="text-xs text-gray-500 mt-1">Line 1 • 500 units • Target Release: Today, 16:00</p>
                <div className="mt-2 text-xs font-semibold px-2 py-1 bg-green-100 text-green-800 inline-block rounded-md">In Progress - 80%</div>
             </div>
             {/* Timeline Item */}
             <div className="relative pl-6 pb-4 border-l-2 border-purple-200 last:border-0 last:pb-0">
                <div className="absolute -left-1.5 top-0 w-3 h-3 bg-gray-300 rounded-full ring-4 ring-white"></div>
                <h4 className="text-sm font-bold text-gray-800">PO-23492 (Meja Makan Kaca)</h4>
                <p className="text-xs text-gray-500 mt-1">Line 3 • 200 units • Target Release: Tomorrow, 10:00</p>
                <div className="mt-2 text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 inline-block rounded-md">Queued</div>
             </div>
              {/* Timeline Item */}
             <div className="relative pl-6 pb-4 border-l-2 border-purple-200 last:border-0 last:pb-0">
                <div className="absolute -left-1.5 top-0 w-3 h-3 bg-red-400 rounded-full ring-4 ring-white"></div>
                <h4 className="text-sm font-bold text-gray-800">PO-23485 (Lemari Pakaian)</h4>
                <p className="text-xs text-gray-500 mt-1">Line 2 • 300 units • Target Release: Yesterday, 17:00</p>
                <div className="mt-2 text-xs font-semibold px-2 py-1 bg-red-100 text-red-800 inline-block rounded-md">Delayed - Material Varnish</div>
             </div>
          </div>
        </div>

        {/* Material Request */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">Urgent Material Requests</h2>
            <button className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-md">Create MR</button>
          </div>

          <ul className="space-y-3">
             <li className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                      <Layers className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-gray-800">Polyurethane Varnish</p>
                      <p className="text-xs text-gray-500">Req for: PO-23485</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-sm font-bold text-gray-800">50 L</p>
                   <p className="text-xs text-red-500 font-medium">Critical</p>
                </div>
             </li>
             <li className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                      <Layers className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-sm font-bold text-gray-800">Paku Triplek 2cm</p>
                      <p className="text-xs text-gray-500">Req for: PO-23491</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="text-sm font-bold text-gray-800">10 Dus</p>
                   <p className="text-xs text-amber-500 font-medium">High</p>
                </div>
             </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
