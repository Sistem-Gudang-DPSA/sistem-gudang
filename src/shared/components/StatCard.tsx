"use client";

import React from "react";
import Link from "next/link";

type Tone = "orange" | "purple" | "teal" | "blue" | "green" | "amber" | "red";

const TONE: Record<Tone, string> = {
  orange: "bg-orange-100 text-orange-600",
  purple: "bg-purple-100 text-purple-600",
  teal: "bg-teal-100 text-teal-600",
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  amber: "bg-amber-100 text-amber-600",
  red: "bg-red-100 text-red-600",
};

interface Props {
  label: string;
  // undefined while loading; pass `error` to show the failure instead of a number.
  value?: React.ReactNode;
  hint?: string;
  error?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  href?: string;
}

// One summary number on a dashboard. Shows "..." while loading and "-" when the request failed,
// never an invented value.
export default function StatCard({ label, value, hint, error, icon: Icon, tone = "blue", href }: Props) {
  const body = (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${TONE[tone]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800" aria-live="polite">{error ? "-" : value ?? "..."}</p>
        {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}
