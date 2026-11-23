"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

// Header sticky dipasang di <thead> tiap layar, bersama class ini dan background opaque.
export const STICKY_HEAD_CLASS = 'sticky top-0 z-10';

// Ruang di bawah tabel untuk footer dan jarak; sisanya dipakai area scroll.
const BOTTOM_RESERVE_PX = 96;
const MIN_HEIGHT_PX = 200;
// Dipakai sebelum posisi tabel terukur (render pertama), lalu diganti angka hasil ukur.
const FALLBACK_MAX_HEIGHT = 'calc(100dvh - 20rem)';

type Props = {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

// Area scroll untuk tabel panjang: header sticky, tinggi mengikuti sisa layar user
// (diukur dari posisi tabel saat ini), supaya baris yang muat sebanyak mungkin
// tanpa mendorong footer keluar layar.
export default function ScrollableTable({ children, className = '', ariaLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState(FALLBACK_MAX_HEIGHT);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const top = Math.max(0, el.getBoundingClientRect().top);
      const available = window.innerHeight - top - BOTTOM_RESERVE_PX;
      setMaxHeight(`${Math.max(MIN_HEIGHT_PX, available)}px`);
    };

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };

    compute();
    // Ukur ulang saat layar berubah atau tata letak di atas tabel berubah
    // (misal panel filter dibuka/ditutup).
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(document.body);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-scroll-table
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      className={`overflow-auto max-h-[var(--table-max-h)] print:max-h-none print:overflow-visible ${className}`}
      style={{ '--table-max-h': maxHeight } as CSSProperties}
    >
      {children}
    </div>
  );
}
