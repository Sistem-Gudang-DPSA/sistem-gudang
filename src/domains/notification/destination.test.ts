import { describe, expect, it } from 'vitest';
import { notificationDestination } from './destination';
import type { Notification } from './types';

const notification: Notification = {
  id: 99, type: 'LOW_STOCK', title: 'Stok menipis', body: '',
  link: '/dashboard/gudang/master/data-barang', readAt: null, createdAt: '',
};

describe('notificationDestination', () => {
  it.each(['gudang', 'gudang-barang-jadi', 'ppic', 'purchasing', 'superadmin'])('keeps the backend division %s and targets the item', (division) => {
    const link = `/dashboard/${division}/master/data-barang`;
    expect(notificationDestination({ ...notification, link })).toBe(`${link}?itemId=99`);
  });

  it('preserves query parameters, hash and an explicit item ID', () => {
    const link = `${notification.link}?from=gudang&itemId=42#stok`;
    expect(notificationDestination({ ...notification, link })).toBe(link);
  });

  it('keeps non-stock notification links unchanged', () => {
    expect(notificationDestination({ ...notification, type: 'BUG_REPORT_UPDATED', link: '/dashboard?laporan=saya' })).toBe('/dashboard?laporan=saya');
  });
});
