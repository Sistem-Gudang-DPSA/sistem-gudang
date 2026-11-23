import { describe, expect, it } from 'vitest';
import { mapConcurrent } from './map-concurrent';

describe('mapConcurrent', () => {
  it('keeps the item order and limits the requests in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const result = await mapConcurrent([5, 1, 4, 2, 3], 2, async (value) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, value));
      inFlight--;
      return value * 10;
    });
    expect(result).toEqual([50, 10, 40, 20, 30]);
    expect(peak).toBe(2);
  });

  it('returns an empty list without calling anything', async () => {
    let calls = 0;
    const result = await mapConcurrent([], 4, async () => { calls++; return 1; });
    expect(result).toEqual([]);
    expect(calls).toBe(0);
  });
});
