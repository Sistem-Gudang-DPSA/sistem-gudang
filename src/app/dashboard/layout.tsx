"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Package, LogOut, Menu, X } from 'lucide-react';
import { refreshSession, logout } from '@/domains/auth/api';
import type { AuthUser } from '@/domains/auth/types';
import SidebarNav from '@/domains/auth/components/SidebarNav';
import AccessDenied from '@/domains/auth/components/AccessDenied';
import { canAccess } from '@/domains/auth/nav';
import { AuthUserProvider } from '@/domains/auth/user-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    refreshSession()
      .then(setUser)
      .catch(() => router.replace(`/?next=${encodeURIComponent(window.location.pathname)}`))
      .finally(() => setIsMounted(true));
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (!isMounted || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userName = user.username;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-xl min-h-screen border-r border-gray-100 z-10 transition-all duration-300">
        <div className="flex items-center justify-center h-20 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">DPSA Sys</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          <SidebarNav user={user} pathname={pathname} />
        </div>

        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-red-500 rounded-xl hover:bg-red-50 transition-all duration-200 group"
          >
             <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
               <LogOut className="w-4 h-4" />
             </div>
             <span className="font-semibold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile navigation drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}></div>
          <aside className="relative flex flex-col w-72 max-w-[85%] h-full bg-white shadow-xl">
            <div className="flex items-center justify-between h-20 px-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-600" />
                <span className="text-lg font-bold text-gray-800">DPSA Sys</span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="p-2 text-gray-500 rounded-lg hover:bg-gray-100" aria-label="Tutup menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-4">
              <SidebarNav user={user} pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full text-red-500 rounded-xl hover:bg-red-50 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-semibold">Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
        {/* Header for Mobile/Desktop */}
        <header className="h-20 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 flex items-center justify-between px-6 z-20 sticky top-0">
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="mr-3 p-2 -ml-2 text-gray-600 rounded-lg hover:bg-gray-100"
              aria-label="Buka menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              <span className="text-lg font-bold text-gray-800">DPSA Sys</span>
            </div>
          </div>
          
          <div className="hidden md:flex flex-1">
             <div className="relative w-full max-w-md">
                <input type="text" placeholder="Search anything..." className="w-full bg-gray-100/50 text-gray-700 text-sm rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all"/>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className=" flex-col items-end hidden md:flex">
                <span className="text-sm font-semibold text-gray-800">{userName || "User"}</span>
                <span className="text-xs text-gray-500">{user.isSuperadmin ? "Super Admin" : user.roleName || "Guest"}</span>
             </div>
             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shadow-inner">
               {userName?.charAt(0) || "U"}
             </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">
          <AuthUserProvider user={user}>
            {canAccess(user, pathname) ? children : <AccessDenied user={user} />}
          </AuthUserProvider>
        </div>
      </main>
    </div>
  );
}

