import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";

type MenuItem = { href: string; label: string; children?: MenuItem[] };

export function AccountLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("account");

  const menu: MenuItem[] = [
    { href: "/mesajlar", label: t("messages") },
    {
      href: "/hesabim/ilanlarim",
      label: t("listings"),
      children: [
        { href: "/hesabim/ilanlarim", label: t("live") },
        { href: "/hesabim/ilanlarim?durum=taslak", label: t("drafts") },
        { href: "/hesabim/ilanlarim?durum=pasif", label: t("inactive") },
      ],
    },
    { href: "/hesabim/favoriler", label: t("favorites") },
    {
      href: "/hesabim/profil",
      label: t("profile"),
      children: [
        { href: "/hesabim/profil", label: t("myProfile") },
        { href: "/hesabim/hakkimda", label: t("about") },
        { href: "/hesabim/ayarlar", label: t("settings") },
        { href: "/hesabim/giris-bilgileri", label: t("login") },
        { href: "/hesabim/gizlilik", label: t("privacy") },
        { href: "/hesabim/hesabi-sil", label: t("deleteAccount") },
      ],
    },
    { href: "/hesabim/sablonlar", label: t("templates") },
  ];

  return (
    <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
      <nav aria-label={t("menuLabel")} className="md:w-64 md:shrink-0">
        <ul className="divide-y divide-black/12">
          {menu.map((item) => (
            <li key={item.label} className="py-2">
              <Link href={item.href} className="block py-1">
                {item.label}
              </Link>
              {item.children ? (
                <ul className="pl-4">
                  {item.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className="block py-1 text-meta font-normal"
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
