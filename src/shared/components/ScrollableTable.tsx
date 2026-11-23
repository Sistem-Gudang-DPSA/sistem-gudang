"use client";

import type { CSSProperties, ReactNode } from 'react';

// Header sticky dipasang di <thead> tiap layar, bersama class ini dan background opaque.
export const STICKY_HEAD_CLASS = 'sticky top-0 z-10';
export const DEFAULT_ROW_HEIGHT_PX = 56;
export const DEFAULT_HEADER_HEIGHT_PX = 48;

type Props = {
  // Jumlah baris yang terlihat sekaligus; semua baris tetap ada dan bisa di-scroll.
  visibleRows: number;
  children: ReactNode;
  rowHeightPx?: number;
  headerHeightPx?: number;
  className?: string;
  ariaLabel?: string;
};

// Area scroll untuk tabel panjang: header sticky dan tinggi mengikuti pilihan baris terlihat.
export default function ScrollableTable({
  visibleRows,
  children,
  rowHeightPx = DEFAULT_ROW_HEIGHT_PX,
  headerHeightPx = DEFAULT_HEADER_HEIGHT_PX,
  className = '',
  ariaLabel,
}: Props) {
  const maxHeight = headerHeightPx + visibleRows * rowHeightPx;
  return (
    <div
      data-scroll-table
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className={`overflow-auto max-h-[var(--table-max-h)] print:max-h-none print:overflow-visible ${className}`}
      style={{ '--table-max-h': `${maxHeight}px` } as CSSProperties}
    >
      {children}
    </div>
  );
}
