import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FullMessages } from "@/components/layout/FullMessages";
import { getViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { robots: { index: false } };

/** A 404 rather than a 403: outsiders should not learn this area exists. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  if (viewer?.profile.role !== "admin") notFound();

  const t = await getTranslations("admin");

  const links = [
    { href: "/admin/metrics", label: t("metrics") },
    { href: "/admin/moderasyon", label: t("moderation") },
    { href: "/admin/sikayetler", label: t("reports") },
    { href: "/admin/kullanicilar", label: t("users") },
  ];

  return (
    <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-4 md:px-6">
      <nav aria-label={t("nav")}>
        <ul className="flex flex-wrap gap-4 border-b border-black/12 pb-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="inline-block py-1">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <FullMessages>{children}</FullMessages>
    </div>
  );
}
