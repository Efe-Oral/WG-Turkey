const LOCALE = "tr-TR";
const TIME_ZONE = "Europe/Istanbul";

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
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(date));
}

/** "01.12.2026 14:30" */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  })
    .format(new Date(date))
    .replace(",", "");
}

/** "Haziran 2026" */
export function formatMonthYear(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(date));
}

/** "3 saat önce", "dün", "2 gün önce". */
export function formatRelativeTime(
  date: Date | string,
  now: Date = new Date(),
): string {
  const minutes = Math.floor(
    (now.getTime() - new Date(date).getTime()) / 60_000,
  );

  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dakika önce`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "dün";
  if (days < 30) return `${days} gün önce`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay önce`;

  return `${Math.floor(months / 12)} yıl önce`;
}

/** "3 saat", without "önce": used in "Yayında: 3 saat". */
export function formatDuration(
  date: Date | string,
  now: Date = new Date(),
): string {
  const relative = formatRelativeTime(date, now);
  if (relative === "dün") return "1 gün";
  return relative.replace(" önce", "");
}

/** "45 dakika", "3 saat", "2 gün". */
export function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} dakika`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} saat`;
  return `${Math.round(minutes / 1440)} gün`;
}

/** Uppercases with Turkish rules, so "kira" becomes "KİRA", not "KIRA". */
export function toTurkishUpperCase(text: string): string {
  return text.toLocaleUpperCase(LOCALE);
}
