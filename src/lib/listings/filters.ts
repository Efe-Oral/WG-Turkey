import { z } from "zod";
import {
  CATEGORIES,
  CATEGORY_SLUGS,
  categoryFromSlug,
  RENTAL_TERMS,
  SEARCH_FEATURES,
  SORT_OPTIONS,
  type ListingCategory,
  type RentalTerm,
  type SearchFeature,
  type SortOption,
} from "./constants";

export type SearchFilters = {
  categories: ListingCategory[];
  districts: string[];
  terms: RentalTerm[];
  minSize?: number;
  maxRent?: number;
  from?: string;
  to?: string;
  houseTypes: string[];
  residents?: "female" | "male" | "mixed";
  gender?: "female" | "male";
  age?: number;
  householdMin?: number;
  householdMax?: number;
  smoking?: "allowed" | "balcony" | "not_allowed";
  furnishing?: "furnished" | "partial" | "unfurnished";
  pets?: boolean;
  postedWithin?: 1 | 3 | 7;
  floor?: string;
  layouts: string[];
  features: SearchFeature[];
  sort: SortOption;
  page: number;
};

export const EMPTY_FILTERS: SearchFilters = {
  categories: [],
  districts: [],
  terms: [],
  houseTypes: [],
  layouts: [],
  features: [],
  sort: "newest",
  page: 1,
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const list = (value: string | string[] | undefined) =>
  first(value)?.split(",").filter(Boolean) ?? [];

const positiveInt = (value: string | undefined) => {
  const result = z.coerce.number().int().positive().max(100_000).safeParse(value);
  return value !== undefined && result.success ? result.data : undefined;
};

const isoDate = (value: string | undefined) =>
  value && z.iso.date().safeParse(value).success ? value : undefined;

const oneOf = <T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined => allowed.find((item) => item === value);

/** Unknown or malformed values are dropped, never passed to the database. */
export function parseFilters(
  params: RawParams,
  path: { category?: ListingCategory; district?: string } = {},
): SearchFilters {
  const queryCategories = list(params.kategori)
    .map(categoryFromSlug)
    .filter((category) => category !== undefined);
  const days = positiveInt(first(params.tarih));

  return {
    categories: path.category ? [path.category] : queryCategories,
    districts: path.district ? [path.district] : list(params.ilce),
    terms: list(params.sure).filter((term): term is RentalTerm =>
      RENTAL_TERMS.includes(term as RentalTerm),
    ),
    minSize: positiveInt(first(params.m2)),
    maxRent: positiveInt(first(params.kira)),
    from: isoDate(first(params.bas)),
    to: isoDate(first(params.bit)),
    houseTypes: list(params.evtipi),
    residents: oneOf(first(params.sakin), ["female", "male", "mixed"] as const),
    gender: oneOf(first(params.cinsiyet), ["female", "male"] as const),
    age: positiveInt(first(params.yas)),
    householdMin: positiveInt(first(params.kisimin)),
    householdMax: positiveInt(first(params.kisimax)),
    smoking: oneOf(first(params.sigara), [
      "allowed",
      "balcony",
      "not_allowed",
    ] as const),
    furnishing: oneOf(first(params.esya), [
      "furnished",
      "partial",
      "unfurnished",
    ] as const),
    pets: first(params.evcil) === "1" ? true : undefined,
    postedWithin: days === 1 || days === 3 || days === 7 ? days : undefined,
    floor: first(params.kat) || undefined,
    layouts: list(params.oda),
    features: list(params.ozellik).filter((feature): feature is SearchFeature =>
      SEARCH_FEATURES.includes(feature as SearchFeature),
    ),
    sort: oneOf(first(params.sira), SORT_OPTIONS) ?? "newest",
    page: positiveInt(first(params.sayfa)) ?? 1,
  };
}

/** True when the URL carries anything beyond its own category and district. */
export function hasQueryFilters(filters: SearchFilters): boolean {
  return buildQuery(filters).size > 0;
}

function buildQuery(filters: SearchFilters): URLSearchParams {
  const query = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  };
  const setList = (key: string, values: string[]) => {
    if (values.length > 0) query.set(key, values.join(","));
  };

  if (filters.categories.length > 1) {
    setList(
      "kategori",
      CATEGORIES.filter((category) =>
        filters.categories.includes(category),
      ).map((category) => CATEGORY_SLUGS[category]),
    );
  }
  if (filters.districts.length > 1) setList("ilce", filters.districts);
  setList("sure", filters.terms);
  set("m2", filters.minSize);
  set("kira", filters.maxRent);
  set("bas", filters.from);
  set("bit", filters.to);
  setList("evtipi", filters.houseTypes);
  set("sakin", filters.residents);
  set("cinsiyet", filters.gender);
  set("yas", filters.age);
  set("kisimin", filters.householdMin);
  set("kisimax", filters.householdMax);
  set("sigara", filters.smoking);
  set("esya", filters.furnishing);
  set("evcil", filters.pets ? 1 : undefined);
  set("tarih", filters.postedWithin);
  set("kat", filters.floor);
  setList("oda", filters.layouts);
  setList("ozellik", filters.features);
  if (filters.sort !== "newest") set("sira", filters.sort);
  if (filters.page > 1) set("sayfa", filters.page);

  return query;
}

/** One category or district gets its own path, the rest go in the query. */
export function buildResultsPath(
  citySlug: string,
  filters: Pick<SearchFilters, "categories" | "districts">,
): string {
  const parts = [`/${citySlug}`];
  if (filters.districts.length === 1) parts.push(filters.districts[0]!);
  if (filters.categories.length === 1) {
    parts.push(CATEGORY_SLUGS[filters.categories[0]!]);
  }
  return parts.join("/");
}

export function buildResultsHref(
  citySlug: string,
  filters: SearchFilters,
): string {
  const query = buildQuery(filters).toString();
  const path = buildResultsPath(citySlug, filters);
  return query ? `${path}?${query}` : path;
}
