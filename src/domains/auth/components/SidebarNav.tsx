"use client";

import React from "react";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, ShieldCheck, Users } from "lucide-react";
import { visibleNav, type NavTheme } from "../nav";
import type { AuthUser } from "../types";

// Tailwind needs full class names, so each theme lists them literally.
const THEME: Record<NavTheme, { summary: string; icon: string; border: string; heading: string; active: string; idle: string }> = {
  orange: {
    summary: "hover:bg-orange-50 hover:text-orange-600 hover:border-orange-100",
    icon: "bg-orange-100 text-orange-600",
    border: "border-orange-50",
    heading: "hover:text-orange-600",
    active: "bg-orange-500 text-white font-medium shadow-sm",
    idle: "text-gray-500 hover:text-orange-600 hover:bg-orange-50",
  },
  purple: {
    summary: "hover:bg-purple-50 hover:text-purple-600 hover:border-purple-100",
    icon: "bg-purple-100 text-purple-600",
    border: "border-purple-50",
    heading: "hover:text-purple-600",
    active: "bg-purple-500 text-white font-medium shadow-sm",
    idle: "text-gray-500 hover:text-purple-600 hover:bg-purple-50",
  },
  teal: {
    summary: "hover:bg-teal-50 hover:text-teal-600 hover:border-teal-100",
    icon: "bg-teal-100 text-teal-600",
    border: "border-teal-50",
    heading: "hover:text-teal-600",
    active: "bg-teal-500 text-white font-medium shadow-sm",
    idle: "text-gray-500 hover:text-teal-600 hover:bg-teal-50",
  },
};

const topLink = (active: boolean) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
    active ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
  }`;

interface Props {
  user: AuthUser;
  pathname: string;
  onNavigate?: () => void;
}

export default function SidebarNav({ user, pathname, onNavigate }: Props) {
  const divisions = visibleNav(user);

  return (
    <nav className="space-y-2">
      {user.isSuperadmin && (
        <>
          <Link href="/dashboard/superadmin" onClick={onNavigate} className={topLink(pathname === "/dashboard/superadmin")}>
            <ShieldCheck className="w-5 h-5" />
            <span className="font-medium">Dashboard SA</span>
          </Link>
          <Link href="/dashboard/superadmin/users" onClick={onNavigate} className={topLink(pathname === "/dashboard/superadmin/users")}>
            <Users className="w-5 h-5" />
            <span className="font-medium">Kelola Data User</span>
          </Link>
        </>
      )}

      <Link href="/dashboard" onClick={onNavigate} className={topLink(pathname === "/dashboard")}>
        <LayoutDashboard className="w-5 h-5" />
        <span className="font-medium">Overview</span>
      </Link>

      {divisions.length > 0 && (
        <div className="pt-4 pb-2">
          <span className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Divisions</span>
        </div>
      )}

      {divisions.map((div) => {
        const t = THEME[div.theme];
        const Icon = div.icon;
        return (
          <details key={div.key} className="group" open>
            <summary
              className={`flex items-center justify-between px-4 py-3 text-gray-600 rounded-xl cursor-pointer transition-all duration-200 list-none [&::-webkit-details-marker]:hidden border border-transparent ${t.summary}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.icon}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-semibold">{div.label}</span>
              </div>
              <ChevronDown className="w-4 h-4 transition-transform group-open:-rotate-180 text-gray-400" />
            </summary>
            <div className={`pl-6 pr-2 py-2 space-y-4 ml-4 border-l-2 mt-1 ${t.border}`}>
              {div.groups.map((group) => (
                <details key={group.title} className="group/section" open>
                  <summary
                    className={`flex items-center justify-between text-sm font-bold text-gray-400 cursor-pointer list-none [&::-webkit-details-marker]:hidden uppercase tracking-wider mb-2 ${t.heading}`}
                  >
                    <span>{group.title}</span>
                    <ChevronDown className="w-3 h-3 transition-transform group-open/section:-rotate-180" />
                  </summary>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`block text-sm py-2 px-3 rounded-lg transition-all ${pathname === item.href ? t.active : t.idle}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
