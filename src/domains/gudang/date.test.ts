import { afterEach, describe, expect, it, vi } from 'vitest';
import { displayDate, toDateRange, todayIso } from './date';

afterEach(() => vi.useRealTimers());

describe('gudang date', () => {
  it('todayIso is the UTC date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T10:00:00Z'));
    expect(todayIso()).toBe('2026-03-05');
  });

  it('displayDate reverses and ignores time part', () => {
    expect(displayDate('2026-03-05')).toBe('05-03-2026');
    expect(displayDate('2026-03-05T12:00:00.000Z')).toBe('05-03-2026');
  });

  describe('toDateRange', () => {
    it('no filter gives empty object', () => expect(toDateRange('', '', '')).toEqual({}));
    it('year only gives whole year', () => expect(toDateRange('', '', '2025')).toEqual({ startDate: '2025-01-01', endDate: '2025-12-31' }));
    it('month without year uses current year', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-01T00:00:00Z'));
      expect(toDateRange('', '2', '')).toEqual({ startDate: '2024-02-01', endDate: '2024-02-29' });
    });
    it('year+month gives month bounds', () => expect(toDateRange('', '4', '2025')).toEqual({ startDate: '2025-04-01', endDate: '2025-04-30' }));
    it('full date gives one day with padding', () => expect(toDateRange('7', '3', '2025')).toEqual({ startDate: '2025-03-07', endDate: '2025-03-07' }));
    it('day without month falls back to the whole year', () => expect(toDateRange('7', '', '2025')).toEqual({ startDate: '2025-01-01', endDate: '2025-12-31' }));
  });
});
