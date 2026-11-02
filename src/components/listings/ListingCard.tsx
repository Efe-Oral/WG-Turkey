import clsx from "clsx";
import { BadgeCheck, ImageOff, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { formatArea, formatDate, formatMonthlyPrice, formatRelativeTime } from "@/lib/format";
import { listingPath, photoUrl } from "@/lib/listings/detail";
import type { ListingSummary } from "@/lib/listings/types";
import { isPhoneVerificationEnabled } from "@/lib/features";
import { FavoriteButton } from "./FavoriteButton";

const MAX_DOTS = 5;

type ListingCardProps = {
  listing: ListingSummary;
  /** Above the fold: the first card is the page's main image. */
  priority?: boolean;
};

// The ablative ending of a year follows how its last digit is said.
const YEAR_SUFFIX = ["dan", "den", "den", "ten", "ten", "ten", "dan", "den", "den", "dan"];

function fromDate(value: string): string {
  const date = formatDate(value);
  return `${date}'${YEAR_SUFFIX[Number(date.at(-1))]}`;
}

export function ListingCard({ listing, priority = false }: ListingCardProps) {
  const t = useTranslations("card");
  const enums = useTranslations("enums");

  const residents =
    (listing.residents_female ?? 0) + (listing.residents_male ?? 0);
  const place = [listing.district_name, listing.neighborhood]
    .filter(Boolean)
    .join(", ");
  const kind =
    listing.category === "room"
      ? listing.household_size
        ? t("household", { count: listing.household_size })
        : enums("category.room")
      : listing.category === "flat" && listing.room_layout
        ? t("flatWithLayout", { layout: listing.room_layout })
        : enums(`category.${listing.category}`);
  const firstLine = [
    kind,
    place,
    listing.category === "room" ? listing.street : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const dots = Math.min(listing.photo_count, MAX_DOTS);

  return (
    <article className="relative flex flex-col overflow-hidden rounded-card border border-black/12 bg-white shadow-card md:min-h-[200px] md:flex-row">
      <div className="relative aspect-4/3 w-full shrink-0 bg-black/4 md:w-[260px] md:self-stretch">
        {listing.cover_path ? (
          <Image
            src={photoUrl(listing.cover_path)}
            alt=""
            fill
            sizes="(min-width: 768px) 260px, 100vw"
            priority={priority}
            className="object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-meta text-black/60">
            <ImageOff aria-hidden="true" size={24} />
            {t("noPhoto")}
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="rounded-pill bg-white px-2 py-0.5 text-small font-medium">
            {t(listing.owner_account_type)}
          </span>
          {listing.is_boosted ? (
            <span className="rounded-pill bg-cyan px-2 py-0.5 text-small font-medium">
              {t("boosted")}
            </span>
          ) : null}
        </div>
        {dots > 1 ? (
          <div
            role="img"
            aria-label={t("photoCount", { count: listing.photo_count })}
            className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-pill bg-black/40 px-2 py-1"
          >
            {Array.from({ length: dots }, (_, index) => (
              <span
                key={index}
                className={clsx(
                  "size-1.5 rounded-pill",
                  index === 0 ? "bg-white" : "bg-white/60",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <p className="pr-10 text-price font-bold tabular-nums">
          {formatMonthlyPrice(listing.total_monthly)}
        </p>
        <h2 className="truncate text-[16px] leading-snug font-semibold">
          {/* The ::after layer makes the whole card one link. */}
          <Link
            href={listingPath(listing)}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {listing.title}
          </Link>
        </h2>
        <p className="truncate text-meta text-black/60">{firstLine}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-meta text-black/60 tabular-nums">
          {listing.size_m2 ? <span>{formatArea(listing.size_m2)}</span> : null}
          {listing.available_from ? (
            <span>
              {listing.size_m2 ? "· " : null}
              {listing.available_to
                ? `${formatDate(listing.available_from)} - ${formatDate(listing.available_to)}`
                : t("fromDate", { date: fromDate(listing.available_from) })}
            </span>
          ) : null}
          {listing.category === "room" && listing.household_size ? (
            <span
              aria-label={t("residents", {
                current: residents,
                total: listing.household_size,
              })}
              role="img"
              className="inline-flex items-center gap-1"
            >
              <span aria-hidden="true">· </span>
              <Users aria-hidden="true" size={14} />
              {residents}/{listing.household_size}
            </span>
          ) : null}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="flex min-w-0 items-center gap-2 text-meta">
            <Avatar
              name={listing.owner_name ?? t("anonymous")}
              src={listing.owner_avatar_url ?? undefined}
              size={28}
              className="shrink-0 text-small"
            />
            <span className="truncate">
              {listing.owner_name ?? t("anonymous")}
            </span>
            {listing.owner_phone_verified && isPhoneVerificationEnabled() ? (
              <BadgeCheck
                role="img"
                aria-label={t("verified")}
                size={16}
                className="shrink-0"
              />
            ) : null}
          </span>
          <span className="shrink-0 text-meta text-black/60">
            {formatRelativeTime(listing.published_at)}
          </span>
        </div>
      </div>

      <div className="absolute top-2 right-2 z-10 md:top-3">
        <FavoriteButton listingId={listing.id} />
      </div>
    </article>
  );
}
