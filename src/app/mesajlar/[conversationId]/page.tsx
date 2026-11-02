import { TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LoginGate } from "@/components/auth/LoginGate";
import { ReportDialog } from "@/components/detail/ReportDialog";
import { ListingSummaryCard } from "@/components/messaging/ListingSummaryCard";
import {
  RentedShortcut,
  ReplyForm,
  ThreadLive,
} from "@/components/messaging/ThreadActions";
import { Card } from "@/components/ui/Card";
import { getViewer } from "@/lib/auth/viewer";
import { formatDateTime } from "@/lib/format";
import { getThread } from "@/lib/messaging/queries";

type PageProps = { params: Promise<{ conversationId: string }> };

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("thread");
  return { title: t("title"), robots: { index: false } };
}

export default async function ThreadPage({ params }: PageProps) {
  const [{ conversationId }, viewer, t, inbox] = await Promise.all([
    params,
    getViewer(),
    getTranslations("thread"),
    getTranslations("inbox"),
  ]);

  if (!viewer) return <LoginGate message={inbox("loginRequired")} />;
  if (!UUID_PATTERN.test(conversationId)) notFound();

  const thread = await getThread(conversationId, viewer);
  if (!thread) notFound();

  const peerName = thread.peer.name ?? inbox("deletedUser");
  const { listing } = thread;
  const canMarkRented =
    thread.isLister && listing !== null && listing.status === "active";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <ThreadLive conversationId={thread.id} messageCount={thread.messages.length} />

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-h1 font-semibold">{peerName}</h1>
        <div className="flex items-center gap-4 text-meta">
          {thread.peer.id ? (
            <ReportDialog target={{ userId: thread.peer.id }} />
          ) : null}
          <Link href="/mesajlar">{t("back")}</Link>
        </div>
      </div>

      {listing ? (
        <ListingSummaryCard
          listing={listing}
          person={{
            name: peerName,
            avatarUrl: thread.peer.avatarUrl,
            memberSince: thread.peer.memberSince,
          }}
        />
      ) : null}

      {thread.peer.about ? (
        <Card className="p-4">
          <h2 className="mb-1 text-meta font-semibold">{t("about")}</h2>
          <p className="whitespace-pre-line">{thread.peer.about}</p>
        </Card>
      ) : null}

      {canMarkRented ? (
        <div className="flex justify-end">
          <RentedShortcut listingId={listing.id} conversationId={thread.id} />
        </div>
      ) : null}

      <ol className="flex flex-col divide-y divide-black/12">
        {thread.messages.map((message) => (
          <li key={message.id} className="py-3">
            {message.flagged ? (
              <p
                role="note"
                className="mb-2 inline-flex items-center gap-2 rounded-input bg-black/4 px-3 py-1 text-meta font-medium"
              >
                <TriangleAlert aria-hidden="true" size={16} />
                {t("scamWarning")}
              </p>
            ) : null}
            <p className="flex items-center justify-between gap-3 text-meta">
              <span className="font-semibold">
                {message.isMine ? inbox("me") : peerName}
              </span>
              <span className="text-black/60 tabular-nums">
                {formatDateTime(message.createdAt)}
              </span>
            </p>
            <p className="mt-1 break-words whitespace-pre-line">{message.body}</p>
            {message.isMine ? null : (
              <div className="mt-1 text-small">
                <ReportDialog target={{ messageId: message.id }} />
              </div>
            )}
          </li>
        ))}
      </ol>

      <ReplyForm conversationId={thread.id} disabled={thread.peer.id === null} />
    </div>
  );
}
