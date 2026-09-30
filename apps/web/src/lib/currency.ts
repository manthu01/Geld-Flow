import { SUPPORTED_DISPLAY_CURRENCIES, type SupportedDisplayCurrency } from "@geld-flow/shared";

export { SUPPORTED_DISPLAY_CURRENCIES };
export type { SupportedDisplayCurrency };

export const CURRENCY_LABELS: Record<SupportedDisplayCurrency, string> = {
  EUR: "Euro (€)",
  GBP: "Pound (£)",
  USD: "Dollar ($)",
  INR: "Rupee (₹)",
  RUB: "Ruble (₽)",
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
  INR: "₹",
  RUB: "₽",
};

// Fixed, approximate rates relative to USD. This is a display-only
// convenience, never applied to a stored Expense — the amount and
// currency an expense was actually logged in is permanent and never
// rewritten, so nothing here can ever cause "money loss." Good enough
// for a portfolio project's free-tier hosting; a paid FX-rate API would
// replace this table if it ever needed to be accurate day-to-day.
const RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1 / 0.92,
  GBP: 1 / 0.79,
  INR: 1 / 83.5,
  RUB: 1 / 92,
};

/** Converts an amount for display only — never call this before writing to the database. */
export function convertForDisplay(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const fromRate = RATES_TO_USD[from];
  const toRate = RATES_TO_USD[to];
  if (!fromRate || !toRate) return amount;
  return (amount * fromRate) / toRate;
}

export function formatMoney(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `${symbol}${formatted}` : `${currency} ${formatted}`;
}
