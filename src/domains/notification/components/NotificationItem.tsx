import { waktuEdit } from "@/domains/inventory/components/RiwayatEditBarangKeluar";
import { notificationAppearance } from "../appearance";
import type { Notification } from "../types";

export default function NotificationItem({ notification: n, onOpen, compact = false, disabled = false }: {
  notification: Notification;
  onOpen: (notification: Notification) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const appearance = notificationAppearance(n);
  const Icon = appearance.Icon;
  return (
    <button type="button" onClick={() => onOpen(n)} disabled={disabled}
      className={`flex w-full gap-3 border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400 disabled:opacity-60 ${n.readAt ? "bg-white" : "bg-slate-50/70"}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${appearance.className}`}>
        <Icon aria-hidden="true" className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${appearance.className}`}>{appearance.label}</span>
          {appearance.source && <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${appearance.source.className}`}>{appearance.source.label}</span>}
          {!n.readAt && <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-blue-600"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-blue-600" />Belum dibaca</span>}
        </span>
        <span className={`block text-sm ${compact ? "truncate" : ""} ${n.readAt ? "font-medium text-gray-700" : "font-semibold text-gray-900"}`}>{n.title}</span>
        <span className={`mt-1 block text-xs leading-relaxed text-gray-500 ${compact ? "line-clamp-2" : ""}`}>{n.body}</span>
        <span className="mt-2 block text-[11px] text-gray-400">{waktuEdit(n.createdAt)} WIB</span>
      </span>
    </button>
  );
}
