import "server-only";
import type { Viewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ListingDetail } from "./types";

const PRIVATE_COLUMNS = ["building_no", "lat", "lng"];

/** Listings under review are visible only to their owner and to admins. */
export async function getPendingListing(
  publicNumber: number,
  viewer: Viewer,
): Promise<ListingDetail | null> {
  const db = createAdminClient();

  const { data: row } = await db
    .from("listings")
    .select("*, provinces(name, slug), districts(name, slug)")
    .eq("public_number", publicNumber)
    .eq("status", "pending_review")
    .maybeSingle();

  if (!row) return null;
  if (row.owner_id !== viewer.id && viewer.profile.role !== "admin") return null;

  const { data: owner } = await db
    .from("public_profiles")
    .select("display_name, avatar_url, account_type, phone_verified, member_since")
    .eq("id", row.owner_id)
    .single();

  const { data: cover } = await db
    .from("listing_photos")
    .select("storage_path")
    .eq("listing_id", row.id)
    .order("sort_order")
    .limit(1)
    .maybeSingle();

  const { provinces, districts, ...rest } = row;
  // Dropped here so private columns never reach a component.
  const safe = Object.fromEntries(
    Object.entries(rest).filter(([column]) => !PRIVATE_COLUMNS.includes(column)),
  ) as unknown as ListingDetail;

  return {
    ...safe,
    province_name: provinces?.name ?? "",
    province_slug: provinces?.slug ?? "",
    district_name: districts?.name ?? "",
    district_slug: districts?.slug ?? "",
    is_boosted: false,
    cover_path: cover?.storage_path ?? null,
    owner_name: owner?.display_name ?? null,
    owner_avatar_url: owner?.avatar_url ?? null,
    owner_account_type: owner?.account_type ?? "private",
    owner_phone_verified: owner?.phone_verified ?? false,
    owner_member_since: owner?.member_since ?? row.created_at,
  };
}

/** Unmasked text for logged-in visitors, with the note they saved. */
export async function getViewerExtras(listingId: string): Promise<{
  descriptions: Pick<
    ListingDetail,
    "desc_room" | "desc_location" | "desc_household" | "desc_other"
  > | null;
  note: string | null;
}> {
  const supabase = await createClient();

  const [descriptions, note] = await Promise.all([
    supabase.rpc("get_listing_descriptions", { p_listing_id: listingId }).maybeSingle(),
    supabase
      .from("listing_notes")
      .select("note")
      .eq("listing_id", listingId)
      .maybeSingle(),
  ]);

  return {
    descriptions: descriptions.data as Pick<
      ListingDetail,
      "desc_room" | "desc_location" | "desc_household" | "desc_other"
    > | null,
    note: note.data?.note ?? null,
  };
}
