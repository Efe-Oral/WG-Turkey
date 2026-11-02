import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");

// Static CSP, as section 6.4 asks for headers in next.config. Next.js inline
// bootstrap scripts need 'unsafe-inline' unless a nonce is issued per request.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org ${supabaseUrl}`.trim(),
  "font-src 'self'",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs}${isDev ? " ws:" : ""}`.trim(),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // OpenStreetMap tile servers need a Referer, so this must not be no-referrer.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: "https",
            hostname: new URL(supabaseUrl).hostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
    minimumCacheTTL: 2_678_400,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
