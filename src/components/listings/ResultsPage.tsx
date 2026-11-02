import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDistricts, getProvinceBySlug, getProvinces, type Province } from "@/lib/geo";
import { formatCurrency } from "@/lib/format";
import {
  CATEGORIES,
  categoryFromSlug,
  PAGE_SIZE,
  SORT_OPTIONS,
  type ListingCategory,
} from "@/lib/listings/constants";
import { getDistrictsWithListings } from "@/lib/listings/detail";
import {
  buildResultsHref,
  buildResultsPath,
  hasQueryFilters,
  parseFilters,
  type SearchFilters,
} from "@/lib/listings/filters";
import { countProvinceListings, searchListings } from "@/lib/listings/search";
import { absoluteUrl } from "@/lib/site";
import { locative } from "@/lib/turkish";
import { TrackOnce } from "@/components/analytics/Trackers";
import { Breadcrumb } from "./Breadcrumb";
import { ListingCard } from "./ListingCard";
import { Pagination } from "./Pagination";
import { RememberCity } from "./RememberCity";
import { ResultsSidebar } from "./ResultsSidebar";
import { SearchControls } from "./SearchControls";
import { SortSelect } from "./SortSelect";
import { EmptyCityLink } from "./EmptyCityLink";
import { RecordResults } from "./RecordResults";

export type ResultsParams = {
  il: string;
  segment?: string;
  ilce?: string;
  kategori?: string;
};

export type ResultsSearchParams = Record<string, string | string[] | undefined>;

type ResolvedRoute = {
  province: Province;
  filters: SearchFilters;
  placeName: string;
};

/** Turns route params into a province and filters, or a 404. */
async function resolveRoute(
  params: ResultsParams,
  searchParams: ResultsSearchParams,
): Promise<ResolvedRoute> {
  const province = await getProvinceBySlug(params.il);
  if (!province) notFound();

  const districts = await getDistricts(province.id);
  const known = (slug: string) => districts.find((item) => item.slug === slug);

  let pathCategory: ListingCategory | undefined;
  let pathDistrict: string | undefined;

  if (params.segment) {
    // A category wins: the seed generator guarantees no district shares its slug.
    pathCategory = categoryFromSlug(params.segment);
    if (!pathCategory) {
      if (!known(params.segment)) notFound();
      pathDistrict = params.segment;
    }
  }

  if (params.ilce) {
    pathCategory = params.kategori ? categoryFromSlug(params.kategori) : undefined;
    if (!pathCategory || !known(params.ilce)) notFound();
    pathDistrict = params.ilce;
  }

  const filters = parseFilters(searchParams, {
    category: pathCategory,
    district: pathDistrict,
  });

  const selected = filters.districts.map(known).filter((item) => item !== undefined);
  filters.districts = selected.map((item) => item.slug);

  return {
    province,
    filters,
    placeName: selected.length === 1 ? selected[0]!.name : province.name,
  };
}

export async function buildResultsMetadata(
  params: ResultsParams,
  searchParams: ResultsSearchParams,
): Promise<Metadata> {
  const { province, filters, placeName } = await resolveRoute(params, searchParams);
  const t = await getTranslations("search");

  const isDistrict = filters.districts.length === 1;
  const districtIds = await resolveDistrictIds(province.id, filters.districts);
  const [result, provinceTotal] = await Promise.all([
    searchListings(province.id, districtIds, filters),
    countProvinceListings(province.id),
  ]);

  const title = isDistrict
    ? t("metaDistrict", { district: placeName, city: province.name })
    : t("metaProvince", { city: province.name });

  const place = locative(placeName);
  const description =
    result.priceRange && result.total > 0
      ? t("metaDescription", {
          place,
          count: result.total,
          min: formatCurrency(result.priceRange.min),
          max: formatCurrency(result.priceRange.max),
        })
      : t("metaDescriptionEmpty", { place });

  const path = buildResultsPath(province.slug, filters);
  const canIndex = provinceTotal > 0 && !hasQueryFilters(filters);

  return {
    title: `${title} | EvArkadaşıAra`,
    description,
    alternates: { canonical: absoluteUrl(path) },
    robots: { index: canIndex, follow: true },
    openGraph: { title, description, url: absoluteUrl(path), type: "website" },
  };
}

async function resolveDistrictIds(
  provinceId: string,
  slugs: string[],
): Promise<string[]> {
  if (slugs.length === 0) return [];
  const districts = await getDistricts(provinceId);
  return districts
    .filter((district) => slugs.includes(district.slug))
    .map((district) => district.id);
}

function buildHeading(
  place: string,
  categories: ListingCategory[],
  label: (category: ListingCategory) => string,
  join: string,
): string {
  const shown = categories.length > 0 ? categories : [...CATEGORIES];
  const names = CATEGORIES.filter((category) => shown.includes(category)).map(label);
  const last = names.pop()!;
  const text = names.length > 0 ? `${names.join(", ")}${join}${last}` : last;

  return `${place} ${text}`;
}

type ResultsPageProps = {
  params: ResultsParams;
  searchParams: ResultsSearchParams;
};

export async function ResultsPage({ params, searchParams }: ResultsPageProps) {
  const { province, filters, placeName } = await resolveRoute(params, searchParams);

  const [t, enums, breadcrumb, cities, districts, popular] = await Promise.all([
    getTranslations("search"),
    getTranslations("enums"),
    getTranslations("breadcrumb"),
    getProvinces(),
    getDistricts(province.id),
    getDistrictsWithListings(province.id),
  ]);

  const districtIds = await resolveDistrictIds(province.id, filters.districts);
  const result = await searchListings(province.id, districtIds, filters);
  const provinceTotal = await countProvinceListings(province.id);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const searchKey = buildResultsHref(province.slug, { ...filters, page: 1 });
  const heading = buildHeading(
    locative(placeName),
    filters.categories,
    (category) => enums(`categoryPlural.${category}`),
    t("titleJoin"),
  );

  const hrefWith = (patch: Partial<SearchFilters>) =>
    buildResultsHref(province.slug, { ...filters, page: 1, ...patch });

  const crumbs = [
    { label: breadcrumb("home"), href: "/" },
    { label: province.name, href: `/${province.slug}` },
    ...(placeName !== province.name
      ? [
          {
            label: placeName,
            href: `/${province.slug}/${filters.districts[0]}`,
          },
        ]
      : []),
    ...(filters.categories.length === 1
      ? [{ label: enums(`category.${filters.categories[0]!}`) }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-page px-4 py-4 md:px-6">
      <RememberCity slug={province.slug} />
      <TrackOnce
        name="search"
        eventKey={searchKey}
        provinceId={province.id}
        districtId={districtIds.length === 1 ? districtIds[0] : undefined}
        props={{ result_count: result.total, filters: searchKey.slice(0, 180) }}
      />
      {result.total === 0 ? (
        <TrackOnce
          name="search_zero_results"
          eventKey={searchKey}
          provinceId={province.id}
          districtId={districtIds.length === 1 ? districtIds[0] : undefined}
          props={{
            province: province.slug,
            district: filters.districts[0] ?? "",
            category: filters.categories[0] ?? "",
            max_rent: filters.maxRent ?? "",
          }}
        />
      ) : null}
      <RecordResults
        ids={result.listings.map((listing) => listing.public_number)}
        total={result.total}
      />
      <SearchControls
        cities={cities}
        districts={districts}
        citySlug={province.slug}
        filters={filters}
      />

      <div className="mt-4 flex flex-col-reverse gap-6 md:flex-row">
        <ResultsSidebar cities={cities} currentCity={province.slug} />

        <div className="min-w-0 flex-1">
          <h1 className="text-h1 font-semibold">{heading}</h1>
          <p className="mt-1 text-meta text-black/60 tabular-nums">
            {t("count", { count: result.total })}
          </p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ul className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => {
                const selected = filters.categories.includes(category);
                return (
                  <li key={category}>
                    <Link
                      href={hrefWith({
                        categories: selected ? [] : [category],
                      })}
                      aria-current={selected ? "true" : undefined}
                      className={`inline-flex min-h-7 items-center rounded-pill px-3 text-meta font-normal tabular-nums hover:no-underline ${
                        selected ? "bg-cyan" : "bg-black/4"
                      }`}
                    >
                      {enums(`category.${category}`)} ({result.categoryCounts[category]})
                    </Link>
                  </li>
                );
              })}
            </ul>
            <SortSelect
              label={t("sort")}
              value={filters.sort}
              options={SORT_OPTIONS.map((sort) => ({
                value: sort,
                label: enums(`sort.${sort}`),
                href: hrefWith({ sort }),
              }))}
            />
          </div>

          {result.listings.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-3">
              {result.listings.map((listing, index) => (
                <li key={listing.id}>
                  <ListingCard listing={listing} priority={index === 0} />
                </li>
              ))}
            </ul>
          ) : provinceTotal === 0 ? (
            <div className="mt-8 flex flex-col items-center gap-4 text-center">
              <p>{t("emptyCity", { city: province.name })}</p>
              <EmptyCityLink label={t("postRoom")} provinceId={province.id} />
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center gap-4 text-center">
              <p>{t("empty")}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href={`/${province.slug}`}
                  className="inline-flex h-11 items-center rounded-pill bg-white px-6 font-medium shadow-card hover:no-underline"
                >
                  {t("clear")}
                </Link>
                <Link
                  href="/ilan-ver"
                  className="inline-flex h-11 items-center rounded-pill bg-cyan px-6 font-bold hover:no-underline hover:brightness-[.94]"
                >
                  {t("postRoom")}
                </Link>
              </div>
            </div>
          )}

          <Pagination
            page={filters.page}
            totalPages={totalPages}
            hrefFor={(page) => buildResultsHref(province.slug, { ...filters, page })}
          />

          {province.seo_text ? (
            <p className="mt-8 whitespace-pre-line text-meta">{province.seo_text}</p>
          ) : null}

          <div className="mt-8">
            <Breadcrumb items={crumbs} />
          </div>

          {popular.length > 0 ? (
            <section className="mt-4">
              <h2 className="mb-2 text-body font-semibold">{t("popularDistricts")}</h2>
              <ul className="flex flex-wrap gap-x-4 text-meta">
                {popular.map((district) => (
                  <li key={district.slug}>
                    <Link
                      href={`/${province.slug}/${district.slug}`}
                      className="inline-block py-1 font-normal"
                    >
                      {district.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
