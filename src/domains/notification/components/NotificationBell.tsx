"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { waktuEdit } from "@/domains/inventory/components/RiwayatEditBarangKeluar";
import { getUnreadCount, listNotifications, markAllNotificationsRead, markNotificationRead } from "../api";
import type { Notification } from "../types";

const POLL_MS = 60_000;
const TOAST_MS = 5_000;

export default function NotificationBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Notification[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError, setRowsError] = useState("");
  // One new notification: clicking opens it (and marks it read). Several: clicking opens the list.
  const [toast, setToast] = useState<{ message: string; newest?: Notification } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Last unread count seen from the server. null until the first load, which never toasts.
  const knownCount = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { count: next } = await getUnreadCount();
      const prev = knownCount.current;
      knownCount.current = next;
      setCount(next);
      if (prev === null || next <= prev) return;
      const page = await listNotifications({ page: 1, pageSize: 1 });
      const newest = page.rows[0];
      if (newest) {
        setToast(next - prev === 1 ? { message: newest.title, newest } : { message: `${next - prev} notifikasi baru` });
      }
    } catch {
      // ignore: the next poll tries again
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      await refresh();
    };
    void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const loadRows = async () => {
    setLoadingRows(true);
    setRowsError("");
    try {
      const page = await listNotifications({ page: 1, pageSize: 10 });
      setRows(page.rows);
      knownCount.current = page.unreadCount;
      setCount(page.unreadCount);
    } catch (err) {
      setRowsError(err instanceof Error ? err.message : "Gagal memuat notifikasi.");
    } finally {
      setLoadingRows(false);
    }
  };

  const toggle = () => {
    if (!open) void loadRows();
    setOpen(!open);
  };

  const openRow = (n: Notification) => {
    setOpen(false);
    if (!n.readAt) void markNotificationRead(n.id).then(refresh).catch(() => {});
    router.push(n.link);
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setRows((rs) => rs.map((r) => ({ ...r, readAt: r.readAt ?? now })));
      knownCount.current = 0;
      setCount(0);
    } catch (err) {
      setRowsError(err instanceof Error ? err.message : "Gagal menandai notifikasi.");
    }
  };

  return (
    <>
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          aria-label="Notifikasi"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={toggle}
          className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full z-30 mt-2 flex max-h-96 w-80 flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-sm font-bold text-gray-800">Notifikasi</span>
              <button
                type="button"
                onClick={markAll}
                disabled={count === 0}
                className="text-xs font-semibold text-indigo-600 disabled:opacity-50"
              >
                Tandai semua dibaca
              </button>
            </div>
            <div className="overflow-y-auto">
              {rowsError && (
                <p role="alert" className="p-4 text-center text-sm text-red-600">
                  {rowsError}
                </p>
              )}
              {!rowsError && !loadingRows && rows.length === 0 && (
                <p className="p-6 text-center text-sm text-gray-400">Belum ada notifikasi</p>
              )}
              {rows.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openRow(n)}
                  className={`flex w-full gap-2 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 ${n.readAt ? "" : "bg-blue-50/40"}`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "" : "bg-blue-600"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${n.readAt ? "font-medium text-gray-700" : "font-bold text-gray-900"}`}>{n.title}</span>
                    <span className="line-clamp-2 block text-xs text-gray-500">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-gray-400">{waktuEdit(n.createdAt)} WIB</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast &&
        createPortal(
          <div role="status" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl bg-gray-900 text-sm text-white shadow-xl">
            <button
              type="button"
              onClick={() => {
                setToast(null);
                if (toast.newest) openRow(toast.newest);
                else if (!open) toggle();
              }}
              className="w-full px-4 py-3 text-left"
            >
              {toast.message}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
