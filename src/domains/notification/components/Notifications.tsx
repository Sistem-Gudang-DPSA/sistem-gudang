"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import Pagination from "@/shared/components/Pagination";
import { useApiData } from "@/shared/lib/use-api-data";
import { useClampPage, usePage } from "@/shared/lib/use-page";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../api";
import { notificationDestination } from "../destination";
import type { Notification } from "../types";
import NotificationItem from "./NotificationItem";

const PAGE_SIZE = 20;

export default function Notifications() {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = usePage(String(unreadOnly));
  const [marking, setMarking] = useState(false);
  const [actionError, setActionError] = useState("");
  const submitting = useRef(false);
  const { data, loading, error, reload } = useApiData(
    () => listNotifications({ page, pageSize: PAGE_SIZE, ...(unreadOnly ? { unreadOnly: true } : {}) }),
    `notifications:${page}:${unreadOnly}`,
    "Gagal memuat notifikasi.",
  );
  const total = data?.total ?? 0;
  const unreadCount = data?.unreadCount ?? 0;
  useClampPage(page, total, PAGE_SIZE, setPage);

  useEffect(() => {
    const onChanged = () => reload();
    window.addEventListener("notifications-changed", onChanged);
    window.addEventListener("stock-notifications-changed", onChanged);
    return () => {
      window.removeEventListener("notifications-changed", onChanged);
      window.removeEventListener("stock-notifications-changed", onChanged);
    };
  }, [reload]);

  const open = async (notification: Notification) => {
    if (submitting.current) return;
    submitting.current = true;
    setMarking(true);
    setActionError("");
    try {
      if (!notification.readAt) {
        await markNotificationRead(notification.id);
        window.dispatchEvent(new Event("notifications-changed"));
      }
      if (notification.type === "LOW_STOCK") router.push(notificationDestination(notification), { scroll: false });
      else router.push(notification.link);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menandai notifikasi.");
    } finally {
      submitting.current = false;
      setMarking(false);
    }
  };

  const markAll = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setMarking(true);
    setActionError("");
    try {
      await markAllNotificationsRead();
      setPage(1);
      window.dispatchEvent(new Event("notifications-changed"));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Gagal menandai notifikasi.");
    } finally {
      submitting.current = false;
      setMarking(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl pb-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Bell aria-hidden="true" className="h-5 w-5" /></span>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">Semua notifikasi untuk Anda, dari setiap divisi.</p>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1" aria-label="Filter notifikasi">
            {[{ label: "Semua", value: false }, { label: "Belum dibaca", value: true }].map((filter) => (
              <button key={filter.label} type="button" aria-pressed={unreadOnly === filter.value} onClick={() => { setPage(1); setUnreadOnly(filter.value); setActionError(""); }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${unreadOnly === filter.value ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                {filter.label}{filter.value && unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
            ))}
          </div>
          <button type="button" disabled={marking || loading || !!error || unreadCount === 0} onClick={() => void markAll()}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-40">
            <CheckCheck aria-hidden="true" className="h-4 w-4" />Tandai semua dibaca
          </button>
        </div>
        {(error || actionError) && <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{actionError || error}</p>}
        {loading && <p role="status" className="p-10 text-center text-sm text-gray-400">Memuat notifikasi...</p>}
        {!loading && !error && data?.rows.length === 0 && <p className="p-12 text-center text-sm text-gray-400">{unreadOnly ? "Tidak ada notifikasi yang belum dibaca." : "Belum ada notifikasi."}</p>}
        {!loading && !error && data?.rows.map((notification) => <NotificationItem key={notification.id} notification={notification} onOpen={(n) => void open(n)} disabled={marking} />)}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} activeClass="bg-indigo-600 text-white border-indigo-600" />
      </div>
    </div>
  );
}
