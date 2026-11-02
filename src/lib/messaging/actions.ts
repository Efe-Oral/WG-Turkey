"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveViewer, type Viewer } from "@/lib/auth/viewer";
import { sendEmail } from "@/lib/email/send";
import { logEvent } from "@/lib/events/log";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  EMAIL_INTERVAL_MS,
  hasScamWords,
  MAX_MESSAGE,
  MAX_NEW_CONVERSATIONS_PER_DAY,
  MIN_FIRST_MESSAGE,
  MIN_SECONDS_BETWEEN_MESSAGES,
  preview,
} from "./rules";

export type SendError =
  | "auth"
  | "too_short"
  | "too_long"
  | "too_fast"
  | "too_many_conversations"
  | "unavailable"
  | "own_listing"
  | "safety"
  | "bot"
  | "failed";

export type SendResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: SendError };

const db = () => createAdminClient();

async function isSendingTooFast(userId: string): Promise<boolean> {
  const since = new Date(
    Date.now() - MIN_SECONDS_BETWEEN_MESSAGES * 1000,
  ).toISOString();

  const { count } = await db()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", userId)
    .gte("created_at", since);

  return (count ?? 0) > 0;
}

type ConversationRow = {
  id: string;
  listing_id: string | null;
  lister_id: string | null;
  seeker_id: string | null;
  lister_unread: number;
  seeker_unread: number;
  first_reply_at: string | null;
  created_at: string;
  last_notified_lister_at: string | null;
  last_notified_seeker_at: string | null;
};

/** At most one email per conversation per hour, and only if the person wants it. */
async function notifyRecipient(
  conversation: ConversationRow,
  senderIsLister: boolean,
): Promise<void> {
  const recipientId = senderIsLister
    ? conversation.seeker_id
    : conversation.lister_id;
  if (!recipientId) return;

  const lastColumn = senderIsLister
    ? "last_notified_seeker_at"
    : "last_notified_lister_at";
  const last = conversation[lastColumn];
  if (last && Date.now() - new Date(last).getTime() < EMAIL_INTERVAL_MS) return;

  const { data: profile } = await db()
    .from("profiles")
    .select("email_notifications")
    .eq("id", recipientId)
    .single();
  if (!profile?.email_notifications) return;

  const { data: user } = await db().auth.admin.getUserById(recipientId);
  if (!user.user?.email) return;

  const sent = await sendEmail({
    to: user.user.email,
    subject: "EvArkadaşıAra: yeni mesajın var",
    text: [
      "Yeni bir mesaj aldın.",
      "",
      `Mesajı oku: ${absoluteUrl(`/mesajlar/${conversation.id}`)}`,
      "",
      `Bu e-postaları kapatmak için: ${absoluteUrl("/hesabim/ayarlar")}`,
    ].join("\n"),
  });

  if (sent) {
    await db()
      .from("conversations")
      .update({ [lastColumn]: new Date().toISOString() })
      .eq("id", conversation.id);
  }
}

async function appendMessage(
  conversation: ConversationRow,
  viewer: Viewer,
  body: string,
): Promise<boolean> {
  const senderIsLister = conversation.lister_id === viewer.id;

  const { error } = await db()
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: viewer.id,
      body,
      flagged: hasScamWords(body),
    });
  if (error) return false;

  const now = new Date();
  const isFirstReply =
    senderIsLister && conversation.first_reply_at === null;

  await db()
    .from("conversations")
    .update({
      last_message_at: now.toISOString(),
      last_message_preview: preview(body),
      last_sender_id: viewer.id,
      ...(senderIsLister
        ? {
            seeker_unread: conversation.seeker_unread + 1,
            archived_by_seeker: false,
          }
        : {
            lister_unread: conversation.lister_unread + 1,
            archived_by_lister: false,
          }),
      ...(isFirstReply ? { first_reply_at: now.toISOString() } : {}),
    })
    .eq("id", conversation.id);

  await notifyRecipient(conversation, senderIsLister);

  if (isFirstReply) {
    const minutes = Math.round(
      (now.getTime() - new Date(conversation.created_at).getTime()) / 60_000,
    );
    await logEvent({
      name: "message_reply",
      userId: viewer.id,
      listingId: conversation.listing_id,
      conversationId: conversation.id,
      props: { reply_latency_minutes: minutes },
    });
  }

  return true;
}

const composeSchema = z.object({
  publicNumber: z.number().int().positive(),
  body: z.string().trim(),
  turnstileToken: z.string().optional(),
});

/** Opens a conversation about a listing, or continues the existing one. */
export async function sendFirstMessage(
  input: z.infer<typeof composeSchema>,
): Promise<SendResult> {
  const parsed = composeSchema.safeParse(input);
  const viewer = await getActiveViewer();
  if (!viewer || !parsed.success) return { ok: false, error: "auth" };

  const { publicNumber, body, turnstileToken } = parsed.data;

  if (body.length < MIN_FIRST_MESSAGE) return { ok: false, error: "too_short" };
  if (body.length > MAX_MESSAGE) return { ok: false, error: "too_long" };
  if (!viewer.profile.safety_ack_at) return { ok: false, error: "safety" };
  if (!(await verifyTurnstile(turnstileToken))) return { ok: false, error: "bot" };

  const { data: listing } = await db()
    .from("public_listings")
    .select("id, owner_id, status, province_id, district_id")
    .eq("public_number", publicNumber)
    .maybeSingle();

  if (!listing || listing.status !== "active") {
    return { ok: false, error: "unavailable" };
  }
  if (listing.owner_id === viewer.id) return { ok: false, error: "own_listing" };
  if (await isSendingTooFast(viewer.id)) return { ok: false, error: "too_fast" };

  const { data: existing } = await db()
    .from("conversations")
    .select("*")
    .eq("listing_id", listing.id)
    .eq("seeker_id", viewer.id)
    .maybeSingle();

  let conversation: ConversationRow | null = existing;

  if (!conversation) {
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await db()
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("seeker_id", viewer.id)
      .gte("created_at", dayAgo);

    if ((count ?? 0) >= MAX_NEW_CONVERSATIONS_PER_DAY) {
      return { ok: false, error: "too_many_conversations" };
    }

    const { data: created } = await db()
      .from("conversations")
      .insert({
        listing_id: listing.id,
        lister_id: listing.owner_id,
        seeker_id: viewer.id,
      })
      .select("*")
      .single();
    conversation = created;
  }

  if (!conversation || !(await appendMessage(conversation, viewer, body))) {
    return { ok: false, error: "failed" };
  }

  await logEvent({
    name: "message_sent",
    userId: viewer.id,
    listingId: listing.id,
    conversationId: conversation.id,
    provinceId: listing.province_id,
    districtId: listing.district_id,
    props: { first_in_conversation: existing === null },
  });

  revalidatePath("/mesajlar");

  return { ok: true, conversationId: conversation.id };
}

const replySchema = z.object({
  conversationId: z.uuid(),
  body: z.string().trim(),
  turnstileToken: z.string().optional(),
});

export async function sendReply(
  input: z.infer<typeof replySchema>,
): Promise<SendResult> {
  const parsed = replySchema.safeParse(input);
  const viewer = await getActiveViewer();
  if (!viewer || !parsed.success) return { ok: false, error: "auth" };

  const { conversationId, body, turnstileToken } = parsed.data;

  if (body.length === 0) return { ok: false, error: "too_short" };
  if (body.length > MAX_MESSAGE) return { ok: false, error: "too_long" };
  if (!(await verifyTurnstile(turnstileToken))) return { ok: false, error: "bot" };

  const { data: conversation } = await db()
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  const isParticipant =
    conversation &&
    (conversation.lister_id === viewer.id ||
      conversation.seeker_id === viewer.id);
  if (!isParticipant) return { ok: false, error: "auth" };

  const peerId =
    conversation.lister_id === viewer.id
      ? conversation.seeker_id
      : conversation.lister_id;
  if (!peerId) return { ok: false, error: "unavailable" };

  if (await isSendingTooFast(viewer.id)) return { ok: false, error: "too_fast" };
  if (!(await appendMessage(conversation, viewer, body))) {
    return { ok: false, error: "failed" };
  }

  await logEvent({
    name: "message_sent",
    userId: viewer.id,
    listingId: conversation.listing_id,
    conversationId,
    props: { first_in_conversation: false },
  });

  revalidatePath(`/mesajlar/${conversationId}`);

  return { ok: true, conversationId };
}

/** Clears the viewer's unread count. Called when a thread opens. */
export async function markConversationRead(conversationId: string): Promise<void> {
  const viewer = await getActiveViewer();
  if (!viewer || !z.uuid().safeParse(conversationId).success) return;

  const { data: conversation } = await db()
    .from("conversations")
    .select("lister_id, seeker_id, lister_unread, seeker_unread")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return;

  const isLister = conversation.lister_id === viewer.id;
  if (!isLister && conversation.seeker_id !== viewer.id) return;

  const unread = isLister ? conversation.lister_unread : conversation.seeker_unread;
  if (unread === 0) return;

  await db()
    .from("conversations")
    .update(isLister ? { lister_unread: 0 } : { seeker_unread: 0 })
    .eq("id", conversationId);

  await db()
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", viewer.id)
    .is("read_at", null);
}

export async function setConversationsArchived(
  conversationIds: string[],
  archived: boolean,
): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  if (!viewer || !z.array(z.uuid()).max(100).safeParse(conversationIds).success) {
    return { ok: false };
  }

  await Promise.all([
    db()
      .from("conversations")
      .update({ archived_by_lister: archived })
      .in("id", conversationIds)
      .eq("lister_id", viewer.id),
    db()
      .from("conversations")
      .update({ archived_by_seeker: archived })
      .in("id", conversationIds)
      .eq("seeker_id", viewer.id),
  ]);

  revalidatePath("/mesajlar");

  return { ok: true };
}

export async function acknowledgeSafety(): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  if (!viewer) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ safety_ack_at: new Date().toISOString() })
    .eq("id", viewer.id);

  if (error) return { ok: false };

  await logEvent({ name: "safety_ack", userId: viewer.id });

  return { ok: true };
}

const templateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(MAX_MESSAGE),
});

export async function saveTemplate(
  input: z.infer<typeof templateSchema>,
): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  const parsed = templateSchema.safeParse(input);
  if (!viewer || !parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("message_templates")
    .insert({ user_id: viewer.id, ...parsed.data });

  revalidatePath("/hesabim/sablonlar");

  return { ok: !error };
}

export async function deleteTemplate(templateId: string): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  if (!viewer || !z.uuid().safeParse(templateId).success) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", templateId);

  revalidatePath("/hesabim/sablonlar");

  return { ok: !error };
}
