"use client";

import React from 'react';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  // Tailwind classes for the active page button, so each division keeps its own color.
  activeClass?: string;
}

const base = 'px-3 py-1 border rounded-md font-medium transition-colors';

// Server-side pagination footer: pass the `page`/`pageSize` sent to the API and the `total` it returned.
export default function Pagination({ page, pageSize, total, onPageChange, activeClass = 'bg-[#FF8A00] text-white border-[#FF8A00]' }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pages = Array.from(new Set([1, page - 1, page, page + 1, lastPage])).filter((p) => p >= 1 && p <= lastPage).sort((a, b) => a - b);

  return (
    <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
      <div>
        Menampilkan <span className="font-semibold text-gray-900">{from}</span> sampai <span className="font-semibold text-gray-900">{to}</span> dari{' '}
        <span className="font-semibold text-gray-900">{total}</span> data
      </div>
      <nav aria-label="Halaman" className="flex flex-wrap items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={`${base} border-gray-200 text-gray-600 hover:bg-white disabled:text-gray-300 disabled:cursor-not-allowed`}>
          Sebelumnya
        </button>
        {pages.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-gray-400">...</span>}
            <button
              type="button"
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onPageChange(p)}
              className={`${base} ${p === page ? activeClass : 'border-gray-200 text-gray-600 hover:bg-white'}`}
            >
              {p}
            </button>
          </React.Fragment>
        ))}
        <button type="button" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)} className={`${base} border-gray-200 text-gray-600 hover:bg-white disabled:text-gray-300 disabled:cursor-not-allowed`}>
          Selanjutnya
        </button>
      </nav>
    </div>
  );
}
