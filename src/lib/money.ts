// Prices are stored in piasters (1 EGP = 100 piasters) and formatted only for display.

export function formatPrice(piasters: number, locale: string): string {
  const pounds = piasters / 100;
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: Number.isInteger(pounds) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pounds);
}

export function formatDate(date: Date, locale: string, withTime = false): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

/** "1,250.50" → 125050 piasters (digits must already be Western). NaN if invalid. */
export function poundsToPiasters(input: string): number {
  const n = Number(input.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
