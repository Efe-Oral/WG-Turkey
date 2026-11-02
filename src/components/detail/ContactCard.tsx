import { BadgeCheck, Flag, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { FavoriteButton } from "@/components/listings/FavoriteButton";
import { formatMonthYear } from "@/lib/format";
import type { ListingDetail } from "@/lib/listings/types";

type ContactCardProps = {
  listing: ListingDetail;
  showVerified: boolean;
};

export function ContactCard({ listing, showVerified }: ContactCardProps) {
  const t = useTranslations("detail");
  const card = useTranslations("card");
  const name = listing.owner_name ?? card("anonymous");

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Avatar name={name} src={listing.owner_avatar_url ?? undefined} size={56} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="text-meta text-black/60">
            {t("memberSince", { date: formatMonthYear(listing.owner_member_since) })}
          </p>
          <p className="text-meta text-black/60">{card(listing.owner_account_type)}</p>
          {listing.owner_phone_verified && showVerified ? (
            <p className="inline-flex items-center gap-1 text-meta">
              <BadgeCheck aria-hidden="true" size={14} />
              {card("verified")}
            </p>
          ) : null}
        </div>
      </div>

      <FavoriteButton listingId={listing.id} />

      <Link
        href={`/mesaj/yeni?ilan=${listing.public_number}`}
        className="inline-flex h-11 items-center justify-center rounded-pill bg-cyan px-6 font-bold hover:no-underline hover:brightness-[.94]"
      >
        {t("message")}
      </Link>

      <div className="flex flex-wrap justify-center gap-x-4 text-meta">
        <span className="inline-flex items-center gap-1 py-1">
          <Flag aria-hidden="true" size={14} />
          {t("report")}
        </span>
        <span className="inline-flex items-center gap-1 py-1">
          <Printer aria-hidden="true" size={14} />
          {t("print")}
        </span>
      </div>
    </Card>
  );
}
