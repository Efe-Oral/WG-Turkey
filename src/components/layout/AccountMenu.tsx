"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { UNREAD_CHANGED_EVENT } from "@/lib/messaging/rules";

type AccountMenuProps = {
  unreadCount: number;
};

const itemClasses =
  "block cursor-pointer rounded-input px-3 py-2 font-normal outline-none data-highlighted:bg-black/4 hover:no-underline";

export function AccountMenu({ unreadCount: serverCount }: AccountMenuProps) {
  const t = useTranslations("header");
  const router = useRouter();
  const { viewer, requireAuth } = useAuth();
  const viewerId = viewer?.id;

  const [unreadCount, setUnreadCount] = useState(serverCount);
  const [lastServerCount, setLastServerCount] = useState(serverCount);
  if (serverCount !== lastServerCount) {
    setLastServerCount(serverCount);
    setUnreadCount(serverCount);
  }

  // Row Level Security limits these events to the viewer's own conversations.
  // The count is read directly: a full page refresh here would race with, and
  // cancel, any navigation in progress.
  useEffect(() => {
    if (!viewerId) return;

    let removeChannel: (() => void) | undefined;
    let cancelled = false;

    const updateCount = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const { data } = await createClient()
        .from("conversations")
        .select("lister_id, lister_unread, seeker_unread");

      setUnreadCount(
        (data ?? []).reduce(
          (total, row) =>
            total +
            (row.lister_id === viewerId ? row.lister_unread : row.seeker_unread),
          0,
        ),
      );
    };

    // A thread can be marked read before this channel finishes subscribing.
    const onChanged = () => void updateCount();
    window.addEventListener(UNREAD_CHANGED_EVENT, onChanged);

    // Loaded on demand: logged-out visitors never need the client library.
    void import("@/lib/supabase/client").then(({ createClient }) => {
      if (cancelled) return;

      const supabase = createClient();
      const channel = supabase
        .channel("unread-count")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversations" },
          () => void updateCount(),
        )
        .subscribe();

      removeChannel = () => void supabase.removeChannel(channel);
    });

    return () => {
      cancelled = true;
      window.removeEventListener(UNREAD_CHANGED_EVENT, onChanged);
      removeChannel?.();
    };
  }, [viewerId]);

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
              void import("@/lib/supabase/client").then(async ({ createClient }) => {
                await createClient().auth.signOut();
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
