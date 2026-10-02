// Keeps only digits. Use in onChange of integer fields (qty, price, quota): `type="number"` still
// accepts "e", "+", "-" and decimals, which the API rejects for every integer field.
export const digitsOnly = (value: string) => value.replace(/\D/g, "");

// Props for an integer text input, so phones show the numeric keypad. Spread it, then set value/onChange.
export const INTEGER_INPUT = { type: "text", inputMode: "numeric", autoComplete: "off" } as const;

// Keeps digits and a single dot, for decimal fields such as dimensions and quantities.
export const decimalOnly = (value: string) => value.replace(/[^\d.]/g, "").replace(/^(\d*\.\d*)\./, "$1");
