"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type SelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  'aria-label': string;
  className?: string;
  emptyText?: string;
  // Server-side search: called with the typed text; the list is then not filtered here.
  onSearch?: (q: string) => void;
};

// Dropdown like a native <select>, with a search box on top of the list.
// The list is position: fixed so the scrolling table it sits in cannot clip it.
export default function SearchableSelect({ value, onChange, options, placeholder, 'aria-label': ariaLabel, className = '', emptyText = 'Tidak ada data', onSearch }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const q = query.trim().toLowerCase();
  const filtered = q && !onSearch ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  const buka = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 2, left: rect.left, width: Math.max(rect.width, 220) });
    setQuery('');
    onSearch?.('');
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const tutup = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const pilih = (option: SelectOption) => {
    onChange(option.value);
    tutup();
  };

  // Close on a click outside, and when the page or table scrolls (the fixed list would drift away).
  useEffect(() => {
    if (!open) return;
    const luar = (e: Event) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', luar);
    document.addEventListener('scroll', luar, true);
    window.addEventListener('resize', luar);
    return () => {
      document.removeEventListener('mousedown', luar);
      document.removeEventListener('scroll', luar, true);
      window.removeEventListener('resize', luar);
    };
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[active]) pilih(filtered[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      tutup();
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? setOpen(false) : buka())}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 text-left cursor-pointer ${className}`}
      >
        <span className={`truncate ${selected ? '' : 'text-gray-800'}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown className="w-4 h-4 shrink-0 text-gray-800" strokeWidth={2.5} />
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="fixed z-[60] bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="border-b border-gray-200">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); onSearch?.(e.target.value); }}
              onKeyDown={onKeyDown}
              placeholder="Cari..."
              aria-label={`Cari ${ariaLabel}`}
              aria-controls={listId}
              className="w-full px-3 py-2 text-sm text-gray-800 focus:outline-none"
            />
          </div>
          <ul id={listId} role="listbox" aria-label={`Pilihan ${ariaLabel}`} className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-gray-400 italic">{emptyText}</li>}
            {filtered.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pilih(o)}
                className={`px-3 py-2 text-sm cursor-pointer ${i === active ? 'bg-gray-200' : ''} ${o.value === value ? 'font-semibold text-gray-900' : 'text-gray-800'}`}
              >
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
