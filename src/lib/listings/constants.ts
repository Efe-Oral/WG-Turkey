export const PAGE_SIZE = 20;
export const MAX_BOOSTED_PER_PAGE = 2;
/** Paused and rented pages answer 200 for this long, then 410 (section 5.3). */
export const GONE_AFTER_DAYS = 30;

export const CATEGORIES = ["room", "studio", "flat"] as const;
export type ListingCategory = (typeof CATEGORIES)[number];

export const CATEGORY_SLUGS: Record<ListingCategory, string> = {
  room: "oda",
  studio: "studyo",
  flat: "daire",
};

export function categoryFromSlug(slug: string): ListingCategory | undefined {
  return CATEGORIES.find((category) => CATEGORY_SLUGS[category] === slug);
}

export const RENTAL_TERMS = ["open_ended", "fixed"] as const;
export type RentalTerm = (typeof RENTAL_TERMS)[number];

export const HOUSEHOLD_TYPES = [
  "student",
  "employed",
  "women",
  "men",
  "mixed",
] as const;
export const EXTRA_HOUSEHOLD_TYPES = ["vegetarian", "lgbti", "quiet"] as const;

export const ROOM_LAYOUTS = ["1+1", "2+1", "3+1", "4+1", "5+1"] as const;

export const MAX_RENT_STEPS = [
  5000, 7500, 10000, 12500, 15000, 20000, 25000, 30000, 40000, 50000,
] as const;

export const MIN_SIZE_STEPS = [10, 15, 20, 30, 50, 75, 100, 150] as const;

export const FLOORS = [
  "basement",
  "ground",
  "garden",
  ...Array.from({ length: 29 }, (_, index) => String(index + 1)),
  "30+",
] as const;

export const SEARCH_FEATURES = [
  "photos",
  "balcony",
  "elevator",
  "internet_included",
  "utilities_included",
  "parking",
  "accessible",
] as const;
export type SearchFeature = (typeof SEARCH_FEATURES)[number];

export const SORT_OPTIONS = [
  "newest",
  "price_asc",
  "price_desc",
  "size_desc",
  "available_from",
  "available_to",
  "household",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_COLUMNS: Record<
  SortOption,
  { column: string; ascending: boolean }
> = {
  newest: { column: "published_at", ascending: false },
  price_asc: { column: "total_monthly", ascending: true },
  price_desc: { column: "total_monthly", ascending: false },
  size_desc: { column: "size_m2", ascending: false },
  available_from: { column: "available_from", ascending: true },
  available_to: { column: "available_to", ascending: true },
  household: { column: "household_size", ascending: true },
};
