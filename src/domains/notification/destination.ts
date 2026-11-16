import type { Notification } from './types';

export function notificationDestination(notification: Notification) {
  if (notification.type !== 'LOW_STOCK') return notification.link;
  const url = new URL(notification.link, 'http://localhost');
  // LOW_STOCK notifications use the item ID as their notification ID.
  if (!url.searchParams.has('itemId')) url.searchParams.set('itemId', String(notification.id));
  return `${url.pathname}${url.search}${url.hash}`;
}
