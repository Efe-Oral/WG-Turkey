import Script from "next/script";

/**
 * Cookie-free web analytics, chosen by env: Plausible or Umami. Renders nothing
 * until a provider is configured.
 */
export function WebAnalytics() {
  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER;
  const src = process.env.NEXT_PUBLIC_ANALYTICS_SCRIPT_URL;
  const site = process.env.NEXT_PUBLIC_ANALYTICS_SITE;

  if (!src || !site) return null;

  if (provider === "plausible") {
    return <Script defer data-domain={site} src={src} strategy="afterInteractive" />;
  }
  if (provider === "umami") {
    return <Script defer data-website-id={site} src={src} strategy="afterInteractive" />;
  }

  return null;
}
