// Keeps only digits. Use in onChange of integer fields (qty, price, quota): `type="number"` still
// accepts "e", "+", "-" and decimals, which the API rejects for every integer field.
export const digitsOnly = (value: string) => value.replace(/\D/g, "");

// Props for an integer text input, so phones show the numeric keypad. Spread it, then set value/onChange.
export const INTEGER_INPUT = { type: "text", inputMode: "numeric", autoComplete: "off" } as const;

// PPN may be decimal with a comma or a dot ("11,5" = 11.5). Empty or not a number gives NaN, never 0.
export const parsePpn = (value: string) => (value.trim() === "" ? NaN : Number(value.replace(",", ".")));

// Keeps digits and a single dot, for decimal fields such as dimensions and quantities.
export const decimalOnly = (value: string) => value.replace(/[^\d.]/g, "").replace(/^(\d*\.\d*)\./, "$1");
