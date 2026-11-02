import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import {
  CATEGORIES,
  MAX_BOOSTED_PER_PAGE,
  PAGE_SIZE,
  SORT_COLUMNS,
  type ListingCategory,
} from "./constants";
import type { SearchFilters } from "./filters";
import type { ListingSummary } from "./types";

const SUMMARY_COLUMNS = [
  "id",
  "public_number",
  "category",
  "title",
  "slug",
  "province_name",
  "province_slug",
  "district_name",
  "district_slug",
  "neighborhood",
  "street",
  "available_from",
  "available_to",
  "size_m2",
  "room_layout",
  "total_monthly",
  "household_size",
  "residents_female",
  "residents_male",
  "photo_count",
  "published_at",
  "is_boosted",
  "cover_path",
  "owner_name",
  "owner_avatar_url",
  "owner_account_type",
  "owner_phone_verified",
].join(", ");

const AMENITY_FEATURES = [
  "balcony",
  "elevator",
  "internet_included",
  "parking",
  "accessible",
] as const;

// supabase-js narrows its query type after every call and cannot express a chain
// built up conditionally, so the builder is untyped inside this file only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Query = any;

/** Applies every filter except category and paging. */
function applyFilters(
  query: Query,
  provinceId: string,
  districtIds: string[],
  filters: SearchFilters,
): Query {
  let q = query.eq("status", "active").eq("province_id", provinceId);

  if (districtIds.length > 0) q = q.in("district_id", districtIds);
  if (filters.terms.length > 0) q = q.in("rental_term", filters.terms);
  if (filters.minSize) q = q.gte("size_m2", filters.minSize);
  if (filters.maxRent) q = q.lte("total_monthly", filters.maxRent);
  // The listing must cover the stay: free by the start, and still free at the end.
  if (filters.from) q = q.lte("available_from", filters.from);
  if (filters.to) {
    q = q.or(`available_to.is.null,available_to.gte.${filters.to}`);
  }
  if (filters.houseTypes.length > 0) {
    q = q.overlaps("household_types", filters.houseTypes);
  }
  if (filters.residents === "female") {
    q = q.gt("residents_female", 0).eq("residents_male", 0);
  }
  if (filters.residents === "male") {
    q = q.gt("residents_male", 0).eq("residents_female", 0);
  }
  if (filters.residents === "mixed") {
    q = q.gt("residents_female", 0).gt("residents_male", 0);
  }
  if (filters.gender) q = q.in("wanted_gender", ["any", filters.gender]);
  if (filters.age) {
    q = q
      .or(`wanted_age_min.is.null,wanted_age_min.lte.${filters.age}`)
      .or(`wanted_age_max.is.null,wanted_age_max.gte.${filters.age}`);
  }
  if (filters.householdMin) q = q.gte("household_size", filters.householdMin);
  if (filters.householdMax) q = q.lte("household_size", filters.householdMax);
  if (filters.smoking) q = q.eq("smoking", filters.smoking);
  if (filters.furnishing) q = q.eq("furnishing", filters.furnishing);
  if (filters.pets) q = q.contains("amenities", ["pets_allowed"]);
  if (filters.postedWithin) {
    const since = Date.now() - filters.postedWithin * 86_400_000;
    q = q.gte("published_at", new Date(since).toISOString());
  }
  if (filters.floor) q = q.eq("floor", filters.floor);
  if (filters.layouts.length > 0) q = q.in("room_layout", filters.layouts);
  if (filters.features.includes("photos")) q = q.gte("photo_count", 1);
  if (filters.features.includes("utilities_included")) {
    q = q.eq("utilities_included", true);
  }

  const amenities = AMENITY_FEATURES.filter((feature) =>
    filters.features.includes(feature),
  );
  if (amenities.length > 0) q = q.contains("amenities", amenities);

  return q;
}

export type SearchResult = {
  listings: ListingSummary[];
  total: number;
  categoryCounts: Record<ListingCategory, number>;
  priceRange: { min: number; max: number } | null;
};

/** Metadata and page ask for the same search, so one request runs it once. */
const searchOnce = cache(
  (key: string): Promise<SearchResult> => {
    const { provinceId, districtIds, filters } = JSON.parse(key) as {
      provinceId: string;
      districtIds: string[];
      filters: SearchFilters;
    };
    return runSearch(provinceId, districtIds, filters);
  },
);

export function searchListings(
  provinceId: string,
  districtIds: string[],
  filters: SearchFilters,
): Promise<SearchResult> {
  return searchOnce(JSON.stringify({ provinceId, districtIds, filters }));
}

async function runSearch(
  provinceId: string,
  districtIds: string[],
  filters: SearchFilters,
): Promise<SearchResult> {
  const db = createPublicClient();
  const view = () => db.from("public_listings");

  const filtered = (query: Query): Query => {
    const q = applyFilters(query, provinceId, districtIds, filters);
    return filters.categories.length > 0
      ? q.in("category", filters.categories)
      : q;
  };

  const countQuery = () => view().select("id", { count: "exact", head: true });

  const [totalResult, boostedTotalResult, ...categoryResults]: Query[] =
    await Promise.all([
      filtered(countQuery()),
      filtered(countQuery()).eq("is_boosted", true),
      ...CATEGORIES.map((category) =>
        applyFilters(countQuery(), provinceId, districtIds, filters).eq(
          "category",
          category,
        ),
      ),
    ]);

  const total: number = totalResult.count ?? 0;
  const boostedTotal: number = boostedTotalResult.count ?? 0;

  // Boosted listings fill the first slots of each page, at most two. Whatever
  // they used on earlier pages is taken off the regular offset.
  const offsetSlots = (filters.page - 1) * MAX_BOOSTED_PER_PAGE;
  const boostedBefore = Math.min(boostedTotal, offsetSlots);
  const boostedHere = Math.min(
    MAX_BOOSTED_PER_PAGE,
    Math.max(0, boostedTotal - offsetSlots),
  );

  const sort = SORT_COLUMNS[filters.sort];
  const regularOffset = (filters.page - 1) * PAGE_SIZE - boostedBefore;
  const regularCount = PAGE_SIZE - boostedHere;

  const columns = () => view().select(SUMMARY_COLUMNS);

  const [boostedRows, regularRows, cheapest, dearest]: Query[] = await Promise.all(
    [
      boostedHere > 0
        ?          filtered(columns())
            .eq("is_boosted", true)
            .order("published_at", { ascending: false })
            .range(boostedBefore, boostedBefore + boostedHere - 1)
        : Promise.resolve({ data: [] }),
      filtered(columns())
        .or("is_boosted.is.null,is_boosted.eq.false")
        .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
        .order("public_number", { ascending: false })
        .range(regularOffset, regularOffset + regularCount - 1),
      filtered(view().select("total_monthly"))
        .order("total_monthly", { ascending: true })
        .limit(1),
      filtered(view().select("total_monthly"))
        .order("total_monthly", { ascending: false })
        .limit(1),
    ],
  );

  for (const result of [totalResult, regularRows]) {
    if (result.error) throw new Error(`Search: ${result.error.message}`);
  }

  const min = cheapest.data?.[0]?.total_monthly;
  const max = dearest.data?.[0]?.total_monthly;

  return {
    listings: [...(boostedRows.data ?? []), ...(regularRows.data ?? [])],
    total,
    categoryCounts: Object.fromEntries(
      CATEGORIES.map((category, index) => [
        category,
        categoryResults[index].count ?? 0,
      ]),
    ) as Record<ListingCategory, number>,
    priceRange: min !== undefined && max !== undefined ? { min, max } : null,
  };
}

/** Whether a province has any active listing at all, for the noindex rule. */
export const countProvinceListings = cache(async (
  provinceId: string,
): Promise<number> => {
  const { count } = await createPublicClient()
    .from("public_listings")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .eq("province_id", provinceId);

  return count ?? 0;
});

export async function findByPublicNumber(
  publicNumber: number,
): Promise<{ public_number: number; slug: string } | null> {
  const { data } = await createPublicClient()
    .from("public_listings")
    .select("public_number, slug")
    .eq("public_number", publicNumber)
    .maybeSingle();

  return data;
}
