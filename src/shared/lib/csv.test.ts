import { expect, it } from 'vitest';
import { toCsv } from './csv';

it('quotes every field, doubles quotes, keeps commas and newlines inside', () => {
  expect(toCsv([['a', 'b,"c"', 1, null], ['x\ny', undefined, 0, '']])).toBe('"a","b,""c""","1",""\r\n"x\ny","","0",""');
});
