import { describe, expect, it } from 'vitest';
import { generateLocations, parseRaks } from './BatchLokasiModal';

describe('batch lokasi', () => {
  it('parses letters and ranges', () => {
    expect(parseRaks('a-c, F,x1')).toEqual(['A', 'B', 'C', 'F']);
  });

  it('generates RAK.KOLOM.BARIS codes', () => {
    const rows = generateLocations(['A', 'B', 'C'], [1, 3], [1, 4]);
    expect(rows).toHaveLength(36);
    expect(rows[0]).toEqual({ code: 'A.1.1', NamaRak: 'A', NomorRak: '1.1' });
    expect(rows.at(-1)?.code).toBe('C.3.4');
  });
});
