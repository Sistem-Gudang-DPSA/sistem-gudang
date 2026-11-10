import { apiClient, toQuery } from "@/shared/lib/api-client";
import type { Notification, NotificationPage } from "./types";

export function getUnreadCount() {
  return apiClient.get<{ count: number }>("/api/v1/notifications/unread-count");
}

export function listNotifications(params?: { page?: number; pageSize?: number }) {
  return apiClient.get<NotificationPage>(`/api/v1/notifications${toQuery(params)}`);
}

export function markNotificationRead(id: number) {
  return apiClient.post<Notification>(`/api/v1/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return apiClient.post<{ updated: number }>("/api/v1/notifications/read-all");
}
