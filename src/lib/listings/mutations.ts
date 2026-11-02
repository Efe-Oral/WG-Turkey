"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getActiveViewer } from "@/lib/auth/viewer";
import { isPhoneVerificationEnabled } from "@/lib/features";
import { logEvent } from "@/lib/events/log";
import { slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeModerationFlags } from "./moderation";
import { computeImageHash, hasEmbeddedMetadata, stripMetadata } from "./photos-server";
import { computeQualityScore } from "./quality";
import {
  checkPublishable,
  countWords,
  listingRowSchema,
  MAX_PHOTOS,
  type ListingFormValues,
  type ListingRow,
  type PublishError,
} from "./schema";

const BUCKET = "listing-photos";
const idSchema = z.uuid();

type OwnedListing = {
  id: string;
  public_number: number;
  status: string;
  owner_id: string;
  published_at: string | null;
};

/** The listing, only if it belongs to the viewer and still exists. */
async function getOwnedListing(
  listingId: string,
  ownerId: string,
): Promise<OwnedListing | null> {
  if (!idSchema.safeParse(listingId).success) return null;

  const { data } = await createAdminClient()
    .from("listings")
    .select("id, public_number, status, owner_id, published_at")
    .eq("id", listingId)
    .eq("owner_id", ownerId)
    .neq("status", "deleted")
    .maybeSingle();

  return data;
}

function withDerivedFields(row: ListingRow) {
  return {
    ...row,
    slug: slugify(row.title),
    word_count: countWords([
      row.desc_room,
      row.desc_location,
      row.desc_household,
      row.desc_other,
    ]),
  };
}

export type SaveResult =
  | { ok: true; id: string; publicNumber: number }
  | { ok: false };

/** Autosave and the draft button. Never changes the status of a new draft. */
export async function saveListing(
  listingId: string | null,
  values: ListingFormValues,
): Promise<SaveResult> {
  const viewer = await getActiveViewer();
  const parsed = listingRowSchema.safeParse(values);
  if (!viewer || !parsed.success) return { ok: false };

  const db = createAdminClient();
  const row = withDerivedFields(parsed.data);

  if (listingId) {
    const listing = await getOwnedListing(listingId, viewer.id);
    if (!listing) return { ok: false };

    const { error } = await db.from("listings").update(row).eq("id", listing.id);
    if (error) return { ok: false };

    // An edit can bring in a scam text, so live listings are checked again.
    if (listing.status === "active") {
      const flags = await computeModerationFlags({
        id: listing.id,
        owner_id: viewer.id,
        district_id: row.district_id,
        rent: row.rent,
        texts: [row.desc_room, row.desc_location, row.desc_household, row.desc_other],
      });
      if (flags.length > 0) {
        await db
          .from("listings")
          .update({ status: "pending_review", moderation_flags: flags })
          .eq("id", listing.id);
      }
      revalidatePath("/ilan/[listing]", "page");
    }

    return { ok: true, id: listing.id, publicNumber: listing.public_number };
  }

  const { data, error } = await db
    .from("listings")
    .insert({ ...row, owner_id: viewer.id })
    .select("id, public_number")
    .single();

  if (error) return { ok: false };

  await logEvent({
    name: "listing_draft_created",
    userId: viewer.id,
    listingId: data.id,
  });

  return { ok: true, id: data.id, publicNumber: data.public_number };
}

export type PublishResult =
  | { ok: true; publicNumber: number; status: "active" | "pending_review" }
  | { ok: false; errors: PublishError[] };

export async function publishListing(
  listingId: string,
  values: ListingFormValues,
): Promise<PublishResult> {
  const viewer = await getActiveViewer();
  if (!viewer) return { ok: false, errors: [] };

  const phoneEnabled = isPhoneVerificationEnabled();
  if (phoneEnabled && !viewer.profile.phone_verified_at) {
    return { ok: false, errors: [{ field: "title", code: "phoneRequired" }] };
  }

  const saved = await saveListing(listingId, values);
  if (!saved.ok) return { ok: false, errors: [] };

  const db = createAdminClient();
  const { data: listing } = await db
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();
  if (!listing) return { ok: false, errors: [] };

  const row = listingRowSchema.parse(values);
  const errors = checkPublishable(row, listing.photo_count);
  if (errors.length > 0) return { ok: false, errors };

  const flags = await computeModerationFlags({
    id: listing.id,
    owner_id: viewer.id,
    district_id: listing.district_id,
    rent: listing.rent,
    texts: [
      listing.desc_room,
      listing.desc_location,
      listing.desc_household,
      listing.desc_other,
    ],
  });

  // Counts this user's earlier listings that ever went public or to review.
  const { count: previous } = await db
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", viewer.id)
    .neq("id", listing.id)
    .not("published_at", "is", null);

  const isFirstListing = (previous ?? 0) === 0;
  const status =
    isFirstListing || flags.length > 0 ? "pending_review" : "active";
  const now = new Date().toISOString();

  const { error } = await db
    .from("listings")
    .update({
      status,
      moderation_flags: flags,
      published_at: now,
      last_bumped_at: now,
      quality_score: computeQualityScore(
        {
          ...listing,
          photoCount: listing.photo_count,
          wordCount: listing.word_count,
          phoneVerified: Boolean(viewer.profile.phone_verified_at),
        },
        phoneEnabled,
      ),
    })
    .eq("id", listing.id);

  if (error) return { ok: false, errors: [] };

  await logEvent({
    name: "listing_submitted",
    userId: viewer.id,
    listingId: listing.id,
    provinceId: listing.province_id,
    districtId: listing.district_id,
    props: { flags, first_listing: isFirstListing },
  });
  if (status === "active") {
    await logEvent({
      name: "listing_published",
      userId: viewer.id,
      listingId: listing.id,
      provinceId: listing.province_id,
      districtId: listing.district_id,
    });
  }

  revalidatePath("/[il]", "page");

  return { ok: true, publicNumber: listing.public_number, status };
}

export type PhotoResult =
  | { ok: true; photo: { id: string; path: string } }
  | { ok: false };

/** Registers a file the browser uploaded, after checking it on the server. */
export async function addPhoto(
  listingId: string,
  path: string,
): Promise<PhotoResult> {
  const viewer = await getActiveViewer();
  if (!viewer) return { ok: false };

  const listing = await getOwnedListing(listingId, viewer.id);
  const expectedPrefix = `${viewer.id}/${listingId}/`;
  if (!listing || !path.startsWith(expectedPrefix) || path.includes("..")) {
    return { ok: false };
  }

  const db = createAdminClient();
  const storage = db.storage.from(BUCKET);

  const { count } = await db
    .from("listing_photos")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId);
  if ((count ?? 0) >= MAX_PHOTOS) {
    await storage.remove([path]);
    return { ok: false };
  }

  const { data: file } = await storage.download(path);
  if (!file) return { ok: false };

  let image: Buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (await hasEmbeddedMetadata(image)) {
      image = await stripMetadata(image);
      await storage.upload(path, image, {
        contentType: "image/webp",
        upsert: true,
      });
    }

    const { default: sharp } = await import("sharp");
    const { width, height } = await sharp(image).metadata();

    const { data: photo, error } = await db
      .from("listing_photos")
      .insert({
        listing_id: listingId,
        storage_path: path,
        width,
        height,
        sort_order: count ?? 0,
        phash: await computeImageHash(image),
      })
      .select("id")
      .single();

    if (error) throw error;

    return { ok: true, photo: { id: photo.id, path } };
  } catch {
    // Not a readable image, so it must not stay in public storage.
    await storage.remove([path]);
    return { ok: false };
  }
}

export async function removePhoto(
  listingId: string,
  photoId: string,
): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  if (!viewer || !(await getOwnedListing(listingId, viewer.id))) {
    return { ok: false };
  }

  const db = createAdminClient();
  const { data: photo } = await db
    .from("listing_photos")
    .select("storage_path")
    .eq("id", photoId)
    .eq("listing_id", listingId)
    .maybeSingle();
  if (!photo) return { ok: false };

  await db.storage.from(BUCKET).remove([photo.storage_path]);
  await db.from("listing_photos").delete().eq("id", photoId);

  return { ok: true };
}

export async function reorderPhotos(
  listingId: string,
  photoIds: string[],
): Promise<{ ok: boolean }> {
  const viewer = await getActiveViewer();
  if (!viewer || !(await getOwnedListing(listingId, viewer.id))) {
    return { ok: false };
  }

  const db = createAdminClient();
  await Promise.all(
    photoIds.map((id, index) =>
      db
        .from("listing_photos")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("listing_id", listingId),
    ),
  );

  return { ok: true };
}
