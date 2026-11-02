import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type { ListingDetail, ListingPhoto, ListingSummary } from "./types";

export { listingPath, parseListingParam, photoUrl } from "./urls";

export const getListing = cache(
  async (publicNumber: number): Promise<ListingDetail | null> => {
    const { data, error } = await createPublicClient()
      .from("public_listings")
      .select("*")
      .eq("public_number", publicNumber)
      .maybeSingle();

    if (error) throw new Error(`Listing: ${error.message}`);

    return data;
  },
);

export async function getListingPhotos(
  listingId: string,
): Promise<ListingPhoto[]> {
  const { data, error } = await createPublicClient()
    .from("listing_photos")
    .select("id, storage_path, width, height")
    .eq("listing_id", listingId)
    .order("sort_order");

  if (error) throw new Error(`Photos: ${error.message}`);

  return data;
}

export async function getSimilarListings(
  listing: Pick<ListingDetail, "id" | "province_id" | "district_id" | "category">,
): Promise<ListingSummary[]> {
  const { data } = await createPublicClient()
    .from("public_listings")
    .select("*")
    .eq("status", "active")
    .eq("province_id", listing.province_id)
    .eq("category", listing.category)
    .neq("id", listing.id)
    .order("published_at", { ascending: false })
    .limit(5);

  return data ?? [];
}

/** Districts of the same province with active listings, for the link lists. */
export async function getDistrictsWithListings(
  provinceId: string,
): Promise<{ name: string; slug: string }[]> {
  const { data } = await createPublicClient()
    .from("public_listings")
    .select("district_name, district_slug")
    .eq("status", "active")
    .eq("province_id", provinceId)
    .limit(500);

  const unique = new Map(
    (data ?? []).map((row) => [row.district_slug, row.district_name]),
  );

  return [...unique.entries()].map(([slug, name]) => ({ name, slug }));
}
