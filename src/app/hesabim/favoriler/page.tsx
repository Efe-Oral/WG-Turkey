import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ListingCard } from "@/components/listings/ListingCard";
import { getFavoriteListings } from "@/lib/account/queries";

export default async function FavoritesPage() {
  const [t, listings] = await Promise.all([
    getTranslations("favoritesPage"),
    getFavoriteListings(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-h1 font-semibold">{t("title")}</h1>
      {listings.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p>{t("empty")}</p>
          <Link
            href="/ilanlar"
            className="inline-flex h-11 items-center rounded-pill bg-cyan px-6 font-bold hover:no-underline hover:brightness-[.94]"
          >
            {t("browse")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <ListingCard listing={listing} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
