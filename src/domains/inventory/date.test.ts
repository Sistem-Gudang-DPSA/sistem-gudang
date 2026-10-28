import { afterEach, describe, expect, it, vi } from 'vitest';
import { displayDate, todayIso } from './date';

describe('date helpers', () => {
  afterEach(() => vi.useRealTimers());

  it('todayIso uses the local day (UTC+7 just after local midnight)', () => {
    process.env.TZ = 'Asia/Jakarta';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T17:30:00Z')); // 00:30 on the 28th in Jakarta
    expect(todayIso()).toBe('2026-10-28');
  });

  it('displayDate keeps date-only strings and localizes timestamps', () => {
    process.env.TZ = 'Asia/Jakarta';
    expect(displayDate('2026-10-28')).toBe('28-10-2026');
    expect(displayDate('2026-10-27T17:30:00Z')).toBe('28-10-2026');
    // Midnight UTC is a date-only value: not shifted to the local day.
    expect(displayDate('2026-10-27T00:00:00.000Z')).toBe('27-10-2026');
    expect(displayDate('2026-10-27T00:00:00Z')).toBe('27-10-2026');
  });
});
