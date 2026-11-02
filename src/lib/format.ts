const LOCALE = "tr-TR";

const numberFormat = new Intl.NumberFormat(LOCALE);

/** "12.500 TL" */
export function formatCurrency(amount: number): string {
  return `${numberFormat.format(amount)} TL`;
}

/** "12.500 TL / ay" */
export function formatMonthlyPrice(amount: number): string {
  return `${formatCurrency(amount)} / ay`;
}

/** "15 m²" */
export function formatArea(squareMeters: number): string {
  return `${numberFormat.format(squareMeters)} m²`;
}

/** "01.12.2026" */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

/** Uppercases with Turkish rules, so "kira" becomes "KİRA", not "KIRA". */
export function toTurkishUpperCase(text: string): string {
  return text.toLocaleUpperCase(LOCALE);
}
