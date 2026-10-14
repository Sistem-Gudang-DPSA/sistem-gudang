"use client";

import React from "react";

// Placeholder for purchasing menu pages that are not built yet, so the sidebar link has a target.
export default function BelumTersedia({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">{title}</h1>
        <p className="text-gray-500 mt-1">Halaman ini belum tersedia.</p>
      </div>
    </div>
  );
}
