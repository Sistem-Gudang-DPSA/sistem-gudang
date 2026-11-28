"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";

export type ActionMenuItem = {
  key: string;
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  hidden?: boolean;
  // Memberi garis pemisah di atas item, dipakai untuk memisahkan aksi berbahaya.
  separator?: boolean;
};

type Props = {
  label: string;
  count?: number;
  items: ActionMenuItem[];
  iconOnly?: boolean;
};

const triggerClass = "flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium";

// Menu aksi bersama. Panel diposisikan fixed supaya tidak terpotong overflow-hidden pada kartu tabel.
export default function ActionMenu({ label, count, items, iconOnly = false }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const visible = items.filter((item) => !item.hidden);
  const text = count === undefined ? label : `${label} (${count})`;

  const tutup = (kembalikanFokus = true) => {
    setOpen(false);
    if (kembalikanFokus) triggerRef.current?.focus();
  };

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const luar = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Node) || (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target))) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        tutup();
      }
    };
    document.addEventListener("mousedown", luar);
    document.addEventListener("scroll", luar, true);
    window.addEventListener("resize", luar);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", luar);
      document.removeEventListener("scroll", luar, true);
      window.removeEventListener("resize", luar);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={text}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClass}
      >
        <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
        {!iconOnly && <span className="hidden sm:inline">{text}</span>}
      </button>
      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={text}
          style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 60 }}
          className={iconOnly ? "flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-xl" : "min-w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-xl"}
        >
          {visible.map((item) => {
            const className = [
              iconOnly ? "group/action relative flex h-10 w-10 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40" : "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50",
              item.separator && !iconOnly ? "mt-1 border-t border-gray-100 pt-2.5" : "",
            ].join(" ");
            const content = <>
              {item.icon}
              <span className={iconOnly ? "pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 group-hover/action:opacity-100 group-focus-visible/action:opacity-100" : undefined}>{item.label}</span>
            </>;
            if (item.href && !item.disabled) return (
              <Link key={item.key} href={item.href} role="menuitem" aria-label={item.label} onClick={() => setOpen(false)} className={className}>
                {content}
              </Link>
            );
            return <button
              key={item.key}
              type="button"
              role="menuitem"
              aria-label={item.label}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
              className={className}
            >
              {content}
            </button>;
          })}
        </div>
      )}
    </>
  );
}
