// shared/components/Modal.tsx
"use client";

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const SIZE = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' };

export default function Modal({ title, onClose, children, footer, size = 'md' }: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof SIZE;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" className={`relative w-full ${SIZE[size]} max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-200`}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
        {children}
        {footer && <div className="flex justify-end gap-3 mt-6">{footer}</div>}
      </div>
    </div>
  );
}