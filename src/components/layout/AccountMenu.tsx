"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";

type AccountMenuProps = {
  unreadCount: number;
};

const itemClasses =
  "block cursor-pointer rounded-input px-3 py-2 font-normal outline-none data-highlighted:bg-black/4 hover:no-underline";

export function AccountMenu({ unreadCount }: AccountMenuProps) {
  const t = useTranslations("header");
  const router = useRouter();
  const { viewer, requireAuth } = useAuth();

  const badge =
    unreadCount > 0 ? (
      <span
        data-testid="unread-badge"
        className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-cyan px-1 text-small font-bold text-black tabular-nums"
      >
        {unreadCount}
      </span>
    ) : null;

  if (!viewer) {
    return (
      <button
        type="button"
        onClick={() => requireAuth()}
        className="ml-auto cursor-pointer py-1 font-medium hover:underline"
      >
        {t("account")}
      </button>
    );
  }

  const links = [
    { href: "/mesajlar", label: t("messages") },
    { href: "/hesabim/ilanlarim", label: t("myListings") },
    { href: "/hesabim/favoriler", label: t("favorites") },
    { href: "/hesabim/profil", label: t("profile") },
    ...(viewer.isAdmin ? [{ href: "/admin/metrics", label: t("admin") }] : []),
  ];

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className="ml-auto inline-flex cursor-pointer items-center gap-1 py-1 font-medium">
        {t("account")}
        {badge}
        <ChevronDown aria-hidden="true" size={16} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-48 rounded-card bg-white p-1 shadow-float"
        >
          {links.map((link) => (
            <DropdownMenu.Item key={link.href} asChild>
              <Link href={link.href} className={itemClasses}>
                {link.label}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Item
            className={itemClasses}
            onSelect={() => {
              void createClient()
                .auth.signOut()
                .then(() => {
                  router.push("/");
                  router.refresh();
                });
            }}
          >
            {t("signOut")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
