"use client";

import clsx from "clsx";
import { Reply } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { setConversationsArchived } from "@/lib/messaging/actions";
import type { InboxRow } from "@/lib/messaging/queries";

const GENDER_SIGN = { female: "♀", male: "♂" } as const;

function peerSuffix(row: InboxRow): string {
  const sign =
    row.peer.gender === "female" || row.peer.gender === "male"
      ? GENDER_SIGN[row.peer.gender]
      : null;
  const parts = [sign, row.peer.age].filter(Boolean);

  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}

type InboxListProps = {
  rows: InboxRow[];
  archived: boolean;
};

export function InboxList({ rows, archived }: InboxListProps) {
  const t = useTranslations("inbox");
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);

  const onArchive = async () => {
    await setConversationsArchived(selected, !archived);
    setSelected([]);
    router.refresh();
  };

  return (
    <>
      {selected.length > 0 ? (
        <div className="mb-3 flex justify-end">
          <Button compact variant="dark" onClick={() => void onArchive()}>
            {archived ? t("unarchive") : t("archive")}
          </Button>
        </div>
      ) : null}
      <ul className="divide-y divide-black/12">
        {rows.map((row) => {
          const name = row.peer.name ?? t("deletedUser");
          const isUnread = row.unread > 0;

          return (
            <li key={row.id} className="relative flex items-center gap-3 py-3">
              <Avatar
                name={name}
                src={row.peer.avatarUrl ?? undefined}
                size={48}
                className="shrink-0"
              />
              <div className={clsx("min-w-0 flex-1", isUnread && "font-bold")}>
                <p className="truncate">
                  <Link
                    href={`/mesajlar/${row.id}`}
                    className={clsx(
                      "after:absolute after:inset-0 after:content-['']",
                      isUnread ? "font-bold" : "font-medium",
                    )}
                  >
                    {name}
                    {peerSuffix(row)}
                  </Link>
                </p>
                <p className="flex items-center gap-1 truncate text-meta">
                  {row.lastIsMine ? (
                    <Reply aria-hidden="true" size={14} className="shrink-0" />
                  ) : null}
                  <span className="truncate">{row.listingTitle ?? t("listingGone")}</span>
                </p>
                <p className="truncate text-meta text-black/60">
                  {row.lastIsMine ? `${t("me")}: ` : ""}
                  {row.lastMessagePreview}
                </p>
                <p className="text-small text-black/60 tabular-nums">
                  {formatDate(row.lastMessageAt)}
                </p>
              </div>
              <input
                type="checkbox"
                aria-label={t("select", { name })}
                checked={selected.includes(row.id)}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? [...selected, row.id]
                      : selected.filter((id) => id !== row.id),
                  )
                }
                className="relative z-10 shrink-0"
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}
