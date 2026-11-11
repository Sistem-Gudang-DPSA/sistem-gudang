import { afterEach, describe, expect, it, vi } from 'vitest';
import { displayDate, displayDateTime, monthStart, todayIso } from './date';

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

  it('displayDateTime shows the business date with the recorded time in Asia/Jakarta', () => {
    expect(displayDateTime('2026-10-27', '2026-10-27T03:30:00Z')).toBe('27-10-2026 10:30');
    expect(displayDateTime('2026-10-27', '2026-10-27T18:05:00.000Z')).toBe('27-10-2026 01:05');
  });

  it('monthStart is the local first day of the current month', () => {
    process.env.TZ = 'Asia/Jakarta';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-31T17:30:00Z')); // 01 Nov 00:30 in Jakarta
    expect(monthStart()).toBe('2026-11-01');
  });
});
