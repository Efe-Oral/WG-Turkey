import { getRequestConfig } from "next-intl/server";

// Only the Turkish locale ships in v1, so URLs carry no locale prefix.
export const locale = "tr";

export default getRequestConfig(async () => ({
  locale,
  timeZone: "Europe/Istanbul",
  messages: (await import("../../messages/tr.json")).default,
}));
