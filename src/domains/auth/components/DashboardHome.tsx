"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { visibleNav, type NavTheme } from "../nav";
import { useAuthUser } from "../user-context";

const THEME: Record<NavTheme, { icon: string; chip: string; border: string }> = {
  orange: { icon: "bg-orange-100 text-orange-600", chip: "hover:bg-orange-50 hover:text-orange-600", border: "hover:border-orange-200" },
  purple: { icon: "bg-purple-100 text-purple-600", chip: "hover:bg-purple-50 hover:text-purple-600", border: "hover:border-purple-200" },
  teal: { icon: "bg-teal-100 text-teal-600", chip: "hover:bg-teal-50 hover:text-teal-600", border: "hover:border-teal-200" },
  indigo : { icon: "bg-indigo-100 text-indigo-600", chip: "hover:bg-indigo-50 hover:text-indigo-600", border: "hover:border-indigo-200" },
};

// Landing page of /dashboard: a greeting and shortcuts to exactly the divisions and pages this user may open.
export default function DashboardHome() {
  const user = useAuthUser();
  const divisions = user ? visibleNav(user) : [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Selamat datang{user ? `, ${user.username}` : ""}
        </h1>
        <p className="text-gray-500">
          {user ? `Anda masuk sebagai ${user.isSuperadmin ? "Super Admin" : user.roleName}.` : ""} Pilih divisi untuk mulai bekerja.
        </p>
      </div>

      {user && divisions.length === 0 && !user.isSuperadmin && (
        <p role="status" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-sm text-gray-600">
          Akun Anda belum punya akses ke halaman mana pun. Hubungi Super Admin untuk mengatur peran Anda.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {user?.isSuperadmin && (
          <Link
            href="/dashboard/superadmin"
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800">Super Admin</h2>
              <p className="text-sm text-gray-500">Kelola user, peran, dan akses.</p>
            </div>
          </Link>
        )}

        {divisions.map((d) => {
          const t = THEME[d.theme];
          const Icon = d.icon;
          return (
            <div key={d.key} className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${t.border} hover:shadow-md transition-all`}>
              <Link href={`/dashboard/${d.key}`} className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${t.icon}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="font-bold text-gray-800">{d.label}</h2>
              </Link>
              <ul className="flex flex-wrap gap-2">
                {d.groups.flatMap((g) => g.items).map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={`inline-block text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 transition-colors ${t.chip}`}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
