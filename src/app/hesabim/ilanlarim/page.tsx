import { ImageOff } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { ListingActions } from "@/components/account/ListingActions";
import { Card } from "@/components/ui/Card";
import { getMyListings, type ListingGroup } from "@/lib/account/queries";
import { getViewer } from "@/lib/auth/viewer";
import { formatDate } from "@/lib/format";
import { listingPath, photoUrl } from "@/lib/listings/urls";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const GROUPS: Record<string, ListingGroup> = {
  taslak: "draft",
  pasif: "inactive",
};

export default async function MyListingsPage({ searchParams }: PageProps) {
  const [params, viewer, t] = await Promise.all([
    searchParams,
    getViewer(),
    getTranslations("myListings"),
  ]);
  if (!viewer) return null;

  const group = GROUPS[String(params.durum)] ?? "live";
  const { listings, counts } = await getMyListings(viewer, group);

  const headings: Record<ListingGroup, string> = {
    live: t("liveHeading", { count: counts.live }),
    draft: t("draftHeading", { count: counts.draft }),
    inactive: t("inactiveHeading", { count: counts.inactive }),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 font-semibold">{t("title")}</h1>
        <Link
          href="/ilan-ver"
          className="inline-flex h-11 items-center rounded-pill bg-cyan px-6 font-bold hover:no-underline hover:brightness-[.94]"
        >
          {t("newListing")}
        </Link>
      </div>

      <h2 className="text-h2 font-semibold tabular-nums">{headings[group]}</h2>

      {listings.length === 0 ? <p className="py-6">{t("empty")}</p> : null}

      <ul className="flex flex-col gap-3">
        {listings.map((listing) => (
          <li key={listing.id}>
            <Card className="relative flex flex-col overflow-hidden sm:flex-row">
              <div className="relative aspect-square w-full shrink-0 bg-black/4 sm:w-[220px]">
                {listing.coverPath ? (
                  <Image
                    src={photoUrl(listing.coverPath)}
                    alt=""
                    fill
                    sizes="220px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-black/60">
                    <ImageOff aria-hidden="true" size={24} />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-h3 font-semibold">
                    <Link
                      href={
                        listing.status === "draft"
                          ? `/ilan/${listing.publicNumber}/duzenle`
                          : listingPath({
                              public_number: listing.publicNumber,
                              slug: listing.slug,
                            })
                      }
                    >
                      {listing.title || t("status.draft")}
                    </Link>
                  </h3>
                  <ListingActions listing={listing} />
                </div>
                <span className="w-fit rounded-pill bg-black/4 px-2 py-0.5 text-small font-medium">
                  {t(`status.${listing.status}`)}
                </span>
                <p className="text-meta text-black/60 tabular-nums">
                  {listing.street
                    ? t("location", {
                        city: listing.cityName ?? "",
                        street: listing.street,
                        number: listing.publicNumber,
                      })
                    : t("locationNoStreet", {
                        city: listing.cityName ?? "",
                        number: listing.publicNumber,
                      })}
                </p>
                <p className="text-meta text-black/60 tabular-nums">
                  {t("updated", {
                    updated: formatDate(listing.updatedAt),
                    created: formatDate(listing.createdAt),
                  })}
                </p>
                <p className="mt-auto pt-2 text-meta tabular-nums">
                  {t("statsMessages")} <strong>{listing.messageCount}</strong> |{" "}
                  {t("statsVisitors")} <strong>{listing.visitorCount}</strong> |{" "}
                  {t("statsQuality")} <strong>{listing.qualityScore}%</strong>
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <p className="text-center text-meta text-black/60 tabular-nums">
        {t("perPage", { count: 20 })}
      </p>
    </div>
  );
}
