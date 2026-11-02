import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { PageViewTracker } from "@/components/analytics/Trackers";
import { WebAnalytics } from "@/components/analytics/WebAnalytics";
import { AuthProvider, type ClientViewer } from "@/components/auth/AuthProvider";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getViewer, isOnboarded } from "@/lib/auth/viewer";
import { getUnreadCount } from "@/lib/messaging/queries";
import { createClient } from "@/lib/supabase/server";
import { locale } from "@/i18n/request";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");

  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
  };
}

// Client components on public pages. Everything else stays on the server, which
// keeps the text out of each page's HTML.
const PUBLIC_CLIENT_NAMESPACES = [
  "common",
  "header",
  "auth",
  "search",
  "enums",
  "card",
  "detail",
  "report",
] as const;

async function getFavoriteIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("listing_id");
  return (data ?? []).map((row) => row.listing_id);
}

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [common, viewer, messages] = await Promise.all([
    getTranslations("common"),
    getViewer(),
    getMessages(),
  ]);

  const publicMessages = Object.fromEntries(
    PUBLIC_CLIENT_NAMESPACES.map((name) => [name, messages[name]]),
  );

  const clientViewer: ClientViewer | null = viewer
    ? {
        id: viewer.id,
        name: viewer.profile.first_name,
        isAdmin: viewer.profile.role === "admin",
        onboarded: isOnboarded(viewer),
      }
    : null;

  const [favoriteIds, unreadCount] = viewer
    ? await Promise.all([getFavoriteIds(), getUnreadCount(viewer.id)])
    : [[], 0];

  return (
    <html lang={locale} className={inter.variable}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider messages={publicMessages}>
          <AuthProvider viewer={clientViewer} favoriteIds={favoriteIds}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2"
            >
              {common("skipToContent")}
            </a>
            <PageViewTracker />
            <WebAnalytics />
            <Header unreadCount={unreadCount} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
