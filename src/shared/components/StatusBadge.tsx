import React from 'react';

export type BadgeTone = 'green' | 'amber' | 'blue' | 'red' | 'gray';

const TONE: Record<BadgeTone, string> = {
  green: 'bg-green-100 text-green-700 border-green-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
};

// One pill style for every status, same as the Dokubah status badge.
export default function StatusBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${TONE[tone]}`}>{children}</span>;
}
