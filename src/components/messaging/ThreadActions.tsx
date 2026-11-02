"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Turnstile } from "@/components/ui/Turnstile";
import { markRented } from "@/lib/listings/lifecycle";
import {
  markConversationRead,
  sendReply,
  type SendError,
} from "@/lib/messaging/actions";
import { MAX_MESSAGE, UNREAD_CHANGED_EVENT } from "@/lib/messaging/rules";
import { createClient } from "@/lib/supabase/client";

/** Marks the thread read and refreshes when the other person writes. */
export function ThreadLive({
  conversationId,
  messageCount,
}: {
  conversationId: string;
  messageCount: number;
}) {
  const router = useRouter();

  useEffect(() => {
    void markConversationRead(conversationId).then(() => {
      window.dispatchEvent(new Event(UNREAD_CHANGED_EVENT));
    });
  }, [conversationId, messageCount]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`thread-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, router]);

  return null;
}

export function ReplyForm({
  conversationId,
  disabled,
}: {
  conversationId: string;
  disabled: boolean;
}) {
  const t = useTranslations("thread");
  const errors = useTranslations("messageErrors");
  const router = useRouter();

  const [body, setBody] = useState("");
  const [error, setError] = useState<SendError>();
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string>();
  const onToken = useCallback((value: string) => setToken(value), []);

  const send = async () => {
    setBusy(true);
    setError(undefined);
    const result = await sendReply({
      conversationId,
      body,
      turnstileToken: token,
    });
    setBusy(false);

    if (result.ok) {
      setBody("");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  if (disabled) {
    return <p className="text-black/60">{t("peerGone")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-meta font-semibold">
        {t("reply")}
        <textarea
          rows={4}
          maxLength={MAX_MESSAGE}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="rounded-input border border-black/20 bg-white p-3 text-body font-normal"
        />
      </label>
      {error ? (
        <p role="alert" className="text-meta text-error">
          {errors(error)}
        </p>
      ) : null}
      <Turnstile onToken={onToken} />
      <div className="flex justify-end">
        <Button disabled={busy || !body.trim()} onClick={() => void send()}>
          {t("send")}
        </Button>
      </div>
    </div>
  );
}

export function RentedShortcut({
  listingId,
  conversationId,
}: {
  listingId: string;
  conversationId: string;
}) {
  const t = useTranslations("thread");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      compact
      variant="secondary"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void markRented(listingId, "yes", conversationId).then(() => {
          setBusy(false);
          router.refresh();
        });
      }}
    >
      {t("markRented")}
    </Button>
  );
}
