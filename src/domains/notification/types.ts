export interface Notification {
  id: number;
  type: string;
  sourceDomain?: string | null;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPage {
  rows: Notification[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}
