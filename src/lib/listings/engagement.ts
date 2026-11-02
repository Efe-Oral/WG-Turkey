"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveViewer } from "@/lib/auth/viewer";
import { logEvent } from "@/lib/events/log";
import { isPhoneVerificationEnabled } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();
const AUTO_PAUSE_REPORTS = 3;

export async function toggleFavorite(
  listingId: string,
): Promise<{ ok: boolean; favorited: boolean }> {
  const viewer = await getActiveViewer();
  if (!viewer || !idSchema.safeParse(listingId).success) {
    return { ok: false, favorited: false };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", viewer.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("favorites")
        .delete()
        .eq("user_id", viewer.id)
        .eq("listing_id", listingId)
    : await supabase
        .from("favorites")
        .insert({ user_id: viewer.id, listing_id: listingId });

  if (error) return { ok: false, favorited: Boolean(existing) };

  await logEvent({
    name: existing ? "favorite_remove" : "favorite_add",
    userId: viewer.id,
    listingId,
  });
  revalidatePath("/hesabim/favoriler");

  return { ok: true, favorited: !existing };
}

const noteSchema = z.object({
  listingId: z.uuid(),
  note: z.string().trim().max(2000),
});

export async function saveNote(
  listingId: string,
  note: string,
): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  const parsed = noteSchema.safeParse({ listingId, note });
  if (!viewer || !parsed.success) return { ok: false };

  const supabase = await createClient();
  const { error } = parsed.data.note
    ? await supabase.from("listing_notes").upsert({
        user_id: viewer.id,
        listing_id: parsed.data.listingId,
        note: parsed.data.note,
      })
    : await supabase
        .from("listing_notes")
        .delete()
        .eq("user_id", viewer.id)
        .eq("listing_id", parsed.data.listingId);

  return { ok: !error };
}

export async function revealPhone(
  listingId: string,
): Promise<{ phone: string | null }> {
  const viewer = await getActiveViewer();
  if (
    !viewer ||
    !isPhoneVerificationEnabled() ||
    !idSchema.safeParse(listingId).success
  ) {
    return { phone: null };
  }

  const db = createAdminClient();
  const { data: listing } = await db
    .from("public_listings")
    .select("owner_id, show_phone")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing?.show_phone) return { phone: null };

  const { data: owner } = await db
    .from("profiles")
    .select("phone, phone_verified_at")
    .eq("id", listing.owner_id)
    .single();
  if (!owner?.phone_verified_at) return { phone: null };

  await logEvent({ name: "phone_reveal", userId: viewer.id, listingId });

  return { phone: owner.phone };
}

const reportSchema = z.object({
  listingId: z.uuid().nullable(),
  messageId: z.uuid().nullable(),
  userId: z.uuid().nullable(),
  reason: z.enum([
    "scam",
    "fake",
    "wrong_info",
    "discriminatory",
    "offensive",
    "already_rented",
    "other",
  ]),
  details: z.string().trim().max(2000),
});

export type ReportInput = z.infer<typeof reportSchema>;

export async function createReport(input: ReportInput): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  const parsed = reportSchema.safeParse(input);
  if (!viewer || !parsed.success) return { ok: false };

  const { listingId, messageId, userId, reason, details } = parsed.data;
  if (!listingId && !messageId && !userId) return { ok: false };

  const db = createAdminClient();
  const { error } = await db.from("reports").insert({
    reporter_id: viewer.id,
    listing_id: listingId,
    message_id: messageId,
    reported_user_id: userId,
    reason,
    details: details || null,
  });
  if (error) return { ok: false };

  await logEvent({
    name: "report_created",
    userId: viewer.id,
    listingId,
    props: { reason },
  });

  if (listingId) {
    const { count } = await db
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .eq("status", "open");

    // Section 10: three open reports pause the listing until it is reviewed.
    if ((count ?? 0) >= AUTO_PAUSE_REPORTS) {
      await db
        .from("listings")
        .update({ status: "paused", paused_at: new Date().toISOString() })
        .eq("id", listingId)
        .eq("status", "active");
    }
  }

  return { ok: true };
}
