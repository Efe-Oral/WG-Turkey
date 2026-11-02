import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { formatMonthYear } from "@/lib/format";
import type { ListingDetail } from "@/lib/listings/types";
import { ContactActions } from "./ContactActions";

type ContactCardProps = {
  listing: ListingDetail;
  phoneFeatureEnabled: boolean;
  initialNote: string | null;
};

export function ContactCard({
  listing,
  phoneFeatureEnabled,
  initialNote,
}: ContactCardProps) {
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
          {listing.owner_phone_verified && phoneFeatureEnabled ? (
            <p className="inline-flex items-center gap-1 text-meta">
              <BadgeCheck aria-hidden="true" size={14} />
              {card("verified")}
            </p>
          ) : null}
        </div>
      </div>

      <ContactActions
        listingId={listing.id}
        publicNumber={listing.public_number}
        initialNote={initialNote}
        showPhoneButton={phoneFeatureEnabled && listing.show_phone}
      />
    </Card>
  );
}
