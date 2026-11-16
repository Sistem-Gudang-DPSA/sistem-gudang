// Keeps only digits. Use in onChange of integer fields (qty, price, quota): `type="number"` still
// accepts "e", "+", "-" and decimals, which the API rejects for every integer field.
export const digitsOnly = (value: string) => value.replace(/\D/g, "");

// Props for an integer text input, so phones show the numeric keypad. Spread it, then set value/onChange.
export const INTEGER_INPUT = { type: "text", inputMode: "numeric", autoComplete: "off" } as const;

// PPN may be decimal with a comma or a dot ("11,5" = 11.5). Empty or not a number gives NaN, never 0.
export const parsePpn = (value: string) => (value.trim() === "" ? NaN : Number(value.replace(",", ".")));

// Keeps digits and a single dot, for decimal fields such as dimensions and quantities.
export const decimalOnly = (value: string) => value.replace(/[^\d.]/g, "").replace(/^(\d*\.\d*)\./, "$1");

// Decimal text with a comma or a dot as the separator, at most `maxDecimals` digits after it. The typed separator is kept.
export const decimalOnlyMax = (value: string, maxDecimals: number) => {
  const m = value.replace(/[^\d.,]/g, "").match(/^(\d*)([.,]?)(\d*)/)!;
  return m[2] ? `${m[1]}${m[2]}${m[3].slice(0, maxDecimals)}` : m[1];
};

// Physical count: 0..1.000.000, up to 3 decimals (stock-opname physicalQty, multipleOf 0.001).
export const PHYSICAL_QTY_INPUT = { type: "text", inputMode: "decimal", autoComplete: "off", maxLength: 11 } as const;
export const MAX_PHYSICAL_QTY = 1_000_000;
export const physicalQtyValid = (value: string) => {
  const n = Number(value.replace(",", "."));
  return value.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= MAX_PHYSICAL_QTY && Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6;
};
