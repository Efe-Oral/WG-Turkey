import { useTranslations } from "next-intl";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { formatArea, formatCurrency, formatMonthYear } from "@/lib/format";
import { listingPath } from "@/lib/listings/urls";

type ListingSummaryCardProps = {
  listing: {
    publicNumber: number;
    title: string;
    slug: string;
    category: string;
    householdSize: number | null;
    sizeM2: number | null;
    total: number;
  };
  person: {
    name: string;
    avatarUrl: string | null;
    memberSince: string | null;
  };
};

export function ListingSummaryCard({ listing, person }: ListingSummaryCardProps) {
  const t = useTranslations("compose");
  const card = useTranslations("card");
  const detail = useTranslations("detail");

  const facts = [
    listing.category === "room" && listing.householdSize
      ? card("household", { count: listing.householdSize })
      : null,
    listing.sizeM2 ? formatArea(listing.sizeM2) : null,
    formatCurrency(listing.total),
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="truncate">{listing.title}</p>
        <p className="font-semibold tabular-nums">{facts}</p>
        <Link
          href={listingPath({
            public_number: listing.publicNumber,
            slug: listing.slug,
          })}
          className="text-meta"
        >
          {t("viewListing")}
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <Avatar name={person.name} src={person.avatarUrl ?? undefined} size={48} />
        <div>
          <p className="font-medium">{person.name}</p>
          {person.memberSince ? (
            <p className="text-meta text-black/60">
              {detail("memberSince", { date: formatMonthYear(person.memberSince) })}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
