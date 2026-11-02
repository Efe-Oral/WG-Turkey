import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { TrackOnce } from "@/components/analytics/Trackers";
import { ContactCard } from "@/components/detail/ContactCard";
import { DescriptionTabs } from "@/components/detail/DescriptionTabs";
import { FeatureGrid } from "@/components/detail/FeatureGrid";
import { Gallery } from "@/components/detail/Gallery";
import { buildFeatureItems } from "@/components/detail/listing-facts";
import { ListingMap } from "@/components/detail/ListingMap";
import { ResultNavigation } from "@/components/detail/ResultNavigation";
import { StickyContactBar } from "@/components/detail/StickyContactBar";
import { Breadcrumb } from "@/components/listings/Breadcrumb";
import { ListingCard } from "@/components/listings/ListingCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { Card } from "@/components/ui/Card";
import { getViewer } from "@/lib/auth/viewer";
import { isPhoneVerificationEnabled } from "@/lib/features";
import {
  formatArea,
  formatCurrency,
  formatDate,
  formatDuration,
  formatResponseTime,
} from "@/lib/format";
import { CATEGORIES, CATEGORY_SLUGS } from "@/lib/listings/constants";
import {
  getDistrictsWithListings,
  getListing,
  getListingPhotos,
  getOwnerResponseMinutes,
  getSimilarListings,
  listingPath,
  parseListingParam,
  photoUrl,
} from "@/lib/listings/detail";
import { getPendingListing, getViewerExtras } from "@/lib/listings/owner-view";
import type { ListingDetail } from "@/lib/listings/types";
import { absoluteUrl } from "@/lib/site";
import { locative } from "@/lib/turkish";

type PageProps = { params: Promise<{ listing: string }> };

async function loadListing(param: string): Promise<ListingDetail> {
  const publicNumber = parseListingParam(param);
  if (!publicNumber) notFound();

  const listing = await getListing(publicNumber);
  if (listing) return listing;

  const viewer = await getViewer();
  const pending = viewer ? await getPendingListing(publicNumber, viewer) : null;
  if (!pending) notFound();

  return pending;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { listing: param } = await params;
  const listing = await loadListing(param);
  const t = await getTranslations("detail");

  const title = t("metaTitle", {
    title: listing.title,
    district: listing.district_name,
    city: listing.province_name,
    price: formatCurrency(listing.total_monthly),
  });
  const description = [
    listing.desc_room,
    listing.desc_location,
    listing.desc_household,
    listing.desc_other,
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 155);
  const canonical = absoluteUrl(listingPath(listing));

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: listing.status === "active", follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: listing.cover_path ? [photoUrl(listing.cover_path)] : undefined,
    },
  };
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 tabular-nums">
      <dt className="text-black/60">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="mb-3 text-h2 font-semibold">{children}</h2>;
}

export default async function ListingPage({ params }: PageProps) {
  const { listing: param } = await params;
  const listing = await loadListing(param);

  // Old or missing slugs land on the one real URL.
  if (param !== listingPath(listing).replace("/ilan/", "")) {
    permanentRedirect(listingPath(listing));
  }

  const [t, enums, breadcrumb, viewer, photos, similar, districts] = await Promise.all([
    getTranslations("detail"),
    getTranslations("enums"),
    getTranslations("breadcrumb"),
    getViewer(),
    getListingPhotos(listing.id),
    getSimilarListings(listing),
    getDistrictsWithListings(listing.province_id),
  ]);

  const categoryPath = `/${listing.province_slug}/${CATEGORY_SLUGS[listing.category]}`;
  const crumbs = [
    { label: breadcrumb("home"), href: "/" },
    { label: listing.province_name, href: `/${listing.province_slug}` },
    { label: enums(`category.${listing.category}`), href: categoryPath },
    { label: listing.title },
  ];

  const isPending = (listing.status as string) === "pending_review";

  if (listing.status !== "active" && !isPending) {
    return (
      <div className="mx-auto max-w-page px-4 py-8 md:px-6">
        <h1 className="text-h1 font-semibold">{t("unavailable")}</h1>
        <p className="mt-1 text-black/60">{listing.title}</p>
        <div className="mt-4">
          <Breadcrumb items={crumbs} />
        </div>
        {similar.length > 0 ? (
          <section className="mt-6">
            <SectionTitle>{t("similar")}</SectionTitle>
            <ul className="flex flex-col gap-3">
              {similar.map((item) => (
                <li key={item.id}>
                  <ListingCard listing={item} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  const [responseMinutes, extras] = await Promise.all([
    getOwnerResponseMinutes(listing.owner_id),
    viewer
      ? getViewerExtras(listing.id)
      : Promise.resolve({ descriptions: null, note: null }),
  ]);
  const text = extras.descriptions ?? listing;

  const isRoom = listing.category === "room";
  const notSpecified = t("notSpecified");
  const money = (value: number | null) =>
    value === null ? notSpecified : formatCurrency(value);

  const tabs = [
    { value: "room", label: t("tabRoom"), text: text.desc_room },
    { value: "location", label: t("tabLocation"), text: text.desc_location },
    { value: "household", label: t("tabHousehold"), text: text.desc_household },
    { value: "other", label: t("tabOther"), text: text.desc_other },
  ].filter((tab): tab is { value: string; label: string; text: string } =>
    Boolean(tab.text?.trim()),
  );

  const residents = [
    listing.residents_female
      ? t("residentsFemale", { count: listing.residents_female })
      : null,
    listing.residents_male
      ? t("residentsMale", { count: listing.residents_male })
      : null,
  ].filter((item) => item !== null);

  const homeLines = [
    listing.room_size_m2 && listing.household_size
      ? t("roomInFlat", {
          size: formatArea(listing.room_size_m2),
          count: listing.household_size,
        })
      : null,
    listing.flat_size_m2
      ? t("flatSizeLine", { size: formatArea(listing.flat_size_m2) })
      : null,
    residents.length > 0
      ? t("residentsLine", { value: residents.join(", ") })
      : null,
    listing.residents_age_min && listing.residents_age_max
      ? t("ageLine", {
          min: listing.residents_age_min,
          max: listing.residents_age_max,
        })
      : null,
    listing.smoking
      ? t("smokingLine", { value: enums(`smoking.${listing.smoking}`) })
      : null,
    listing.household_types.length > 0
      ? t("typeLine", {
          value: listing.household_types
            .map((type) => enums(`houseType.${type}`))
            .join(", "),
        })
      : null,
    listing.languages.length > 0
      ? t("languagesLine", {
          value: listing.languages
            .map((language) => enums(`language.${language}`))
            .join(", "),
        })
      : null,
  ].filter((line) => line !== null);

  const wantedLines = [
    listing.wanted_gender
      ? t("wantedGender", { value: enums(`gender.${listing.wanted_gender}`) })
      : null,
    listing.wanted_age_min && listing.wanted_age_max
      ? t("wantedAge", {
          min: listing.wanted_age_min,
          max: listing.wanted_age_max,
        })
      : null,
  ].filter((line) => line !== null);

  const features = buildFeatureItems(listing, t, enums);
  const [card, preview] = await Promise.all([
    getTranslations("card"),
    getTranslations("preview"),
  ]);
  const place = locative(listing.district_name);
  const provincePlace = locative(listing.province_name);
  const phoneFeatureEnabled = isPhoneVerificationEnabled();
  const hasMaskedText = !viewer && tabs.some((tab) => tab.text.includes("•••"));

  return (
    <div className="mx-auto max-w-page px-4 py-4 md:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Accommodation",
          name: listing.title,
          url: absoluteUrl(listingPath(listing)),
          image: listing.cover_path ? photoUrl(listing.cover_path) : undefined,
          floorSize: listing.size_m2
            ? { "@type": "QuantitativeValue", value: listing.size_m2, unitCode: "MTK" }
            : undefined,
          address: {
            "@type": "PostalAddress",
            addressLocality: listing.district_name,
            addressRegion: listing.province_name,
            addressCountry: "TR",
          },
          offers: {
            "@type": "Offer",
            price: listing.total_monthly,
            priceCurrency: "TRY",
            availability: "https://schema.org/InStock",
          },
        }}
      />

      <TrackOnce
        name="listing_view"
        listingId={listing.id}
        provinceId={listing.province_id}
        districtId={listing.district_id}
      />
      {isPending ? (
        <p role="status" className="mb-4 rounded-card bg-cyan px-4 py-3 font-medium">
          {preview("pendingBanner")}
        </p>
      ) : null}

      <StickyContactBar
        listingId={listing.id}
        publicNumber={listing.public_number}
        ownerName={listing.owner_name ?? card("anonymous")}
        ownerType={card(listing.owner_account_type)}
      />

      <div className="flex flex-col-reverse gap-6 md:flex-row">
        <aside className="md:w-[300px] md:shrink-0">
          <div className="md:sticky md:top-4">
            <ContactCard
              listing={listing}
              phoneFeatureEnabled={phoneFeatureEnabled}
              initialNote={extras.note}
            />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <ResultNavigation publicNumber={listing.public_number} />

          <h1 className="text-h1 font-semibold">{listing.title}</h1>

          <Gallery
            listingId={listing.id}
            title={listing.title}
            photos={photos.map((photo) => ({
              id: photo.id,
              url: photoUrl(photo.storage_path),
            }))}
          />
          <p className="-mt-2 text-small text-black/60 tabular-nums">
            {t("listingNumber", { number: listing.public_number })}
          </p>

          <div className="flex flex-wrap justify-between gap-2 rounded-card bg-graphite px-4 py-3 text-white tabular-nums">
            {listing.size_m2 ? (
              <span>
                {isRoom ? t("roomSize") : t("flatSize")}:{" "}
                <strong>{formatArea(listing.size_m2)}</strong>
              </span>
            ) : null}
            <span>
              {t("totalCost")}: <strong>{formatCurrency(listing.total_monthly)}</strong>
            </span>
          </div>

          <Card className="p-4">
            <SectionTitle>{t("costTitle")}</SectionTitle>
            <dl>
              <CostRow label={t("rent")} value={money(listing.rent)} />
              <CostRow label={t("dues")} value={money(listing.dues)} />
              <CostRow
                label={t("utilities")}
                value={
                  listing.utilities_included
                    ? t("includedInRent")
                    : money(listing.utilities_estimate)
                }
              />
              <CostRow label={t("otherCosts")} value={money(listing.other_costs)} />
              <CostRow label={t("deposit")} value={money(listing.deposit)} />
            </dl>
            {responseMinutes !== null ? (
              <p className="mt-2 text-meta text-black/60">
                {t("responseTime", { time: formatResponseTime(responseMinutes) })}
              </p>
            ) : null}
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <SectionTitle>{t("addressTitle")}</SectionTitle>
              {listing.street ? <p>{listing.street}</p> : null}
              {listing.neighborhood ? <p>{listing.neighborhood}</p> : null}
              <p>
                {listing.district_name}, {listing.province_name}
              </p>
            </Card>
            <Card className="p-4 tabular-nums">
              <SectionTitle>{t("availabilityTitle")}</SectionTitle>
              {listing.available_from ? (
                <p>{t("start", { date: formatDate(listing.available_from) })}</p>
              ) : null}
              <p>
                {listing.available_to
                  ? t("end", { date: formatDate(listing.available_to) })
                  : t("endOpen")}
              </p>
              <p>{t("online", { time: formatDuration(listing.published_at) })}</p>
            </Card>
          </div>

          {tabs.length > 0 ? (
            <Card className="p-4">
              <DescriptionTabs label={t("tabsLabel")} tabs={tabs} />
              {hasMaskedText ? (
                <p className="text-meta text-black/60">{t("maskedNote")}</p>
              ) : null}
            </Card>
          ) : null}

          {isRoom && homeLines.length > 0 ? (
            <Card className="p-4">
              <SectionTitle>{t("homeDetails")}</SectionTitle>
              <h3 className="font-semibold">{t("homeHeading")}</h3>
              <ul className="mt-1 list-disc pl-5">
                {homeLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {wantedLines.length > 0 ? (
                <>
                  <h3 className="mt-3 font-semibold">{t("wantedHeading")}</h3>
                  <ul className="mt-1 list-disc pl-5">
                    {wantedLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </Card>
          ) : null}

          {features.length > 0 ? (
            <Card className="p-4">
              <SectionTitle>{t("featuresTitle")}</SectionTitle>
              <FeatureGrid items={features} />
            </Card>
          ) : null}

          {listing.public_lat !== null && listing.public_lng !== null ? (
            <Card className="flex flex-col gap-3 p-4">
              <SectionTitle>{t("mapTitle")}</SectionTitle>
              <ListingMap
                lat={listing.public_lat}
                lng={listing.public_lng}
                label={t("mapLabel")}
              />
              <p className="text-meta text-black/60">{t("mapNote")}</p>
              <Link href={`/${listing.province_slug}/${listing.district_slug}`}>
                {t("nearby")}
              </Link>
            </Card>
          ) : null}

          <Breadcrumb items={crumbs} />

          <div className="grid gap-4 text-meta sm:grid-cols-3">
            <section>
              <h2 className="mb-1 font-semibold">{t("moreInDistrict", { place })}</h2>
              <ul>
                {CATEGORIES.map((category) => (
                  <li key={category}>
                    <Link
                      href={`/${listing.province_slug}/${listing.district_slug}/${CATEGORY_SLUGS[category]}`}
                      className="inline-block py-1 font-normal"
                    >
                      {enums(`category.${category}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="mb-1 font-semibold">{t("nearbyDistricts")}</h2>
              <ul>
                {districts
                  .filter((item) => item.slug !== listing.district_slug)
                  .slice(0, 6)
                  .map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/${listing.province_slug}/${item.slug}`}
                        className="inline-block py-1 font-normal"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
            <section>
              <h2 className="mb-1 font-semibold">
                {t("categoriesIn", { place: provincePlace })}
              </h2>
              <ul>
                {CATEGORIES.map((category) => (
                  <li key={category}>
                    <Link
                      href={`/${listing.province_slug}/${CATEGORY_SLUGS[category]}`}
                      className="inline-block py-1 font-normal"
                    >
                      {enums(`category.${category}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
