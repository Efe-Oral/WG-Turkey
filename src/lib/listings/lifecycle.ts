"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveViewer } from "@/lib/auth/viewer";
import { logEvent } from "@/lib/events/log";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.uuid();
const STORAGE_BUCKET = "listing-photos";

async function getOwn(listingId: string) {
  const viewer = await getActiveViewer();
  if (!viewer || !idSchema.safeParse(listingId).success) return null;

  const { data: listing } = await createAdminClient()
    .from("listings")
    .select("id, status, owner_id, province_id, district_id")
    .eq("id", listingId)
    .eq("owner_id", viewer.id)
    .neq("status", "deleted")
    .maybeSingle();

  return listing ? { listing, viewer } : null;
}

function refreshListingPages() {
  revalidatePath("/hesabim/ilanlarim");
  revalidatePath("/ilan/[listing]", "page");
}

export async function pauseListing(listingId: string): Promise<{ ok: boolean }> {
  const own = await getOwn(listingId);
  if (!own || own.listing.status !== "active") return { ok: false };

  const { error } = await createAdminClient()
    .from("listings")
    .update({ status: "paused", paused_at: new Date().toISOString() })
    .eq("id", listingId);
  if (error) return { ok: false };

  await logEvent({
    name: "listing_paused",
    userId: own.viewer.id,
    listingId,
    provinceId: own.listing.province_id,
    districtId: own.listing.district_id,
  });
  refreshListingPages();

  return { ok: true };
}

/** A listing paused by reports stays down until an admin clears them. */
export async function resumeListing(listingId: string): Promise<{ ok: boolean }> {
  const own = await getOwn(listingId);
  if (!own || own.listing.status !== "paused") return { ok: false };

  const db = createAdminClient();
  const { count } = await db
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("status", "open");
  if ((count ?? 0) >= 3) return { ok: false };

  const now = new Date().toISOString();
  const { error } = await db
    .from("listings")
    .update({ status: "active", paused_at: null, last_bumped_at: now })
    .eq("id", listingId);
  if (error) return { ok: false };

  await logEvent({
    name: "listing_renewed",
    userId: own.viewer.id,
    listingId,
    props: { source: "resume" },
  });
  refreshListingPages();

  return { ok: true };
}

const rentedSchema = z.object({
  via: z.enum(["yes", "no", "elsewhere"]),
  conversationId: z.uuid().nullable(),
});

/** The north star metric: did the platform find the housemate? */
export async function markRented(
  listingId: string,
  via: "yes" | "no" | "elsewhere",
  conversationId: string | null,
): Promise<{ ok: boolean }> {
  const own = await getOwn(listingId);
  const parsed = rentedSchema.safeParse({ via, conversationId });
  if (!own || !parsed.success) return { ok: false };

  const db = createAdminClient();

  if (parsed.data.conversationId) {
    const { data: conversation } = await db
      .from("conversations")
      .select("id")
      .eq("id", parsed.data.conversationId)
      .eq("listing_id", listingId)
      .eq("lister_id", own.viewer.id)
      .maybeSingle();
    if (!conversation) return { ok: false };
  }

  const { error } = await db
    .from("listings")
    .update({
      status: "rented",
      rented_at: new Date().toISOString(),
      rented_via_platform: parsed.data.via,
      rented_conversation_id: parsed.data.conversationId,
    })
    .eq("id", listingId);
  if (error) return { ok: false };

  await logEvent({
    name: "listing_rented",
    userId: own.viewer.id,
    listingId,
    conversationId: parsed.data.conversationId,
    provinceId: own.listing.province_id,
    districtId: own.listing.district_id,
    props: { rented_via_platform: parsed.data.via },
  });
  refreshListingPages();

  return { ok: true };
}

const DELETE_REASONS = [
  "rented_here",
  "rented_elsewhere",
  "changed_mind",
  "other",
] as const;

export async function deleteListing(
  listingId: string,
  reason: (typeof DELETE_REASONS)[number],
): Promise<{ ok: boolean }> {
  const own = await getOwn(listingId);
  if (!own || !DELETE_REASONS.includes(reason)) return { ok: false };

  const db = createAdminClient();

  // Section 6.4: originals go when the listing goes.
  const { data: photos } = await db
    .from("listing_photos")
    .select("storage_path")
    .eq("listing_id", listingId);
  const paths = (photos ?? [])
    .map((photo) => photo.storage_path)
    .filter((path) => !path.startsWith("seed/"));
  if (paths.length > 0) await db.storage.from(STORAGE_BUCKET).remove(paths);
  await db.from("listing_photos").delete().eq("listing_id", listingId);

  const { error } = await db
    .from("listings")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      delete_reason: reason,
    })
    .eq("id", listingId);
  if (error) return { ok: false };

  await logEvent({
    name: "listing_deleted",
    userId: own.viewer.id,
    listingId,
    provinceId: own.listing.province_id,
    districtId: own.listing.district_id,
    props: { reason },
  });
  refreshListingPages();

  return { ok: true };
}

export async function recordBoostInterest(listingId: string): Promise<void> {
  const own = await getOwn(listingId);
  if (!own) return;

  await logEvent({ name: "boost_interest", userId: own.viewer.id, listingId });
}
