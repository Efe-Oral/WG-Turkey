export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

export const DEFAULT_CITY = "ankara";
export const LAST_CITY_COOKIE = "last_city";
