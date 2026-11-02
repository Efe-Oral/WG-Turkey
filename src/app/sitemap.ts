import type { MetadataRoute } from "next";
import { listingPath } from "@/lib/listings/detail";
import { createPublicClient } from "@/lib/supabase/public";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

const MAX_LISTINGS = 40_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data } = await createPublicClient()
    .from("public_listings")
    .select("public_number, slug, province_slug, district_slug, published_at")
    .eq("status", "active")
    .order("published_at", { ascending: false })
    .limit(MAX_LISTINGS);

  const listings = data ?? [];

  // Only places with listings: empty pages are noindex.
  const provinces = new Set(listings.map((item) => item.province_slug));
  const districts = new Set(
    listings.map((item) => `${item.province_slug}/${item.district_slug}`),
  );

  return [
    { url: absoluteUrl("/") },
    ...[...provinces].map((slug) => ({ url: absoluteUrl(`/${slug}`) })),
    ...[...districts].map((path) => ({ url: absoluteUrl(`/${path}`) })),
    ...listings.map((listing) => ({
      url: absoluteUrl(listingPath(listing)),
      lastModified: listing.published_at,
    })),
  ];
}
