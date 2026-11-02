"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getViewer, type Viewer } from "@/lib/auth/viewer";
import { sendEmail } from "@/lib/email/send";
import { logEvent } from "@/lib/events/log";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (viewer?.profile.role !== "admin" || viewer.profile.banned_at) notFound();
  return viewer;
}

const idSchema = z.uuid();
const db = () => createAdminClient();

async function emailOwner(ownerId: string, subject: string, text: string) {
  const { data } = await db().auth.admin.getUserById(ownerId);
  if (data.user?.email) await sendEmail({ to: data.user.email, subject, text });
}

export async function approveListing(listingId: string): Promise<{ ok: boolean }> {
  const admin = await requireAdmin();
  if (!idSchema.safeParse(listingId).success) return { ok: false };

  const now = new Date().toISOString();
  const { data: listing, error } = await db()
    .from("listings")
    .update({
      status: "active",
      moderation_flags: [],
      reviewed_by: admin.id,
      reviewed_at: now,
      reject_reason: null,
      published_at: now,
      last_bumped_at: now,
    })
    .eq("id", listingId)
    .eq("status", "pending_review")
    .select("owner_id, title, province_id, district_id")
    .single();
  if (error) return { ok: false };

  const place = {
    listingId,
    provinceId: listing.province_id,
    districtId: listing.district_id,
  };
  await logEvent({ name: "listing_approved", userId: admin.id, ...place });
  await logEvent({ name: "listing_published", userId: listing.owner_id, ...place });
  await emailOwner(
    listing.owner_id,
    "EvArkadaşıAra: ilanın yayında",
    `"${listing.title}" ilanın onaylandı ve yayına girdi.`,
  );

  revalidatePath("/admin/moderasyon");

  return { ok: true };
}

const rejectSchema = z.object({
  listingId: z.uuid(),
  reason: z.string().trim().min(1).max(1000),
});

export async function rejectListing(
  listingId: string,
  reason: string,
): Promise<{ ok: boolean }> {
  const admin = await requireAdmin();
  const parsed = rejectSchema.safeParse({ listingId, reason });
  if (!parsed.success) return { ok: false };

  const { data: listing, error } = await db()
    .from("listings")
    .update({
      status: "draft",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      reject_reason: parsed.data.reason,
    })
    .eq("id", listingId)
    .eq("status", "pending_review")
    .select("owner_id, title, province_id, district_id")
    .single();
  if (error) return { ok: false };

  await logEvent({
    name: "listing_rejected",
    userId: admin.id,
    listingId,
    provinceId: listing.province_id,
    districtId: listing.district_id,
  });
  await emailOwner(
    listing.owner_id,
    "EvArkadaşıAra: ilanın yayınlanamadı",
    `"${listing.title}" ilanın yayınlanamadı.\n\nSebep: ${parsed.data.reason}\n\nİlanını düzenleyip yeniden gönderebilirsin.`,
  );

  revalidatePath("/admin/moderasyon");

  return { ok: true };
}

export async function handleReport(
  reportId: string,
  action: "dismiss" | "pause" | "ban",
): Promise<{ ok: boolean }> {
  const admin = await requireAdmin();
  if (!idSchema.safeParse(reportId).success) return { ok: false };

  const { data: report } = await db()
    .from("reports")
    .select("id, listing_id, reported_user_id, message_id")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return { ok: false };

  let targetOwner = report.reported_user_id as string | null;

  if (report.listing_id) {
    const { data: listing } = await db()
      .from("listings")
      .select("owner_id")
      .eq("id", report.listing_id)
      .maybeSingle();
    targetOwner ??= listing?.owner_id ?? null;
  }
  if (report.message_id) {
    const { data: message } = await db()
      .from("messages")
      .select("sender_id")
      .eq("id", report.message_id)
      .maybeSingle();
    targetOwner ??= message?.sender_id ?? null;
  }

  if (action === "pause" && report.listing_id) {
    await db()
      .from("listings")
      .update({ status: "paused", paused_at: new Date().toISOString() })
      .eq("id", report.listing_id)
      .eq("status", "active");
  }
  if (action === "ban") {
    if (!targetOwner) return { ok: false };
    await setBanned(targetOwner, true);
  }

  await db()
    .from("reports")
    .update({
      status: action === "dismiss" ? "dismissed" : "actioned",
      handled_by: admin.id,
      handled_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  revalidatePath("/admin/sikayetler");

  return { ok: true };
}

async function setBanned(userId: string, banned: boolean): Promise<void> {
  await db()
    .from("profiles")
    .update({ banned_at: banned ? new Date().toISOString() : null })
    .eq("id", userId);

  // Section 10: a ban pauses every listing of that user.
  if (banned) {
    await db()
      .from("listings")
      .update({ status: "paused", paused_at: new Date().toISOString() })
      .eq("owner_id", userId)
      .eq("status", "active");
  }
}

export async function setUserBanned(
  userId: string,
  banned: boolean,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!idSchema.safeParse(userId).success) return { ok: false };

  await setBanned(userId, banned);
  revalidatePath("/admin/kullanicilar");

  return { ok: true };
}

export async function setAccountType(
  userId: string,
  accountType: "private" | "business",
): Promise<{ ok: boolean }> {
  await requireAdmin();
  const type = z.enum(["private", "business"]).safeParse(accountType);
  if (!idSchema.safeParse(userId).success || !type.success) return { ok: false };

  const { error } = await db()
    .from("profiles")
    .update({ account_type: type.data })
    .eq("id", userId);

  revalidatePath("/admin/kullanicilar");

  return { ok: !error };
}

const BOOST_DAYS = 7;

/** Testing only: no payment exists anywhere (section 11). */
export async function setListingBoost(
  listingId: string,
  boosted: boolean,
): Promise<{ ok: boolean }> {
  await requireAdmin();
  if (!idSchema.safeParse(listingId).success) return { ok: false };

  const { error } = await db()
    .from("listings")
    .update(
      boosted
        ? {
            boosted_until: new Date(
              Date.now() + BOOST_DAYS * 86_400_000,
            ).toISOString(),
            boost_source: "admin_test",
          }
        : { boosted_until: null, boost_source: null },
    )
    .eq("id", listingId);

  revalidatePath("/admin/kullanicilar");

  return { ok: !error };
}
