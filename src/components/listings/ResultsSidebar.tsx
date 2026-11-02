import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { FavoritesCard } from "./FavoritesCard";
import { NumberSearch } from "./NumberSearch";

type ResultsSidebarProps = {
  cities: { name: string; slug: string }[];
  currentCity: string;
};

export function ResultsSidebar({ cities, currentCity }: ResultsSidebarProps) {
  const t = useTranslations("search");

  return (
    <aside className="flex flex-col gap-3 md:w-60 md:shrink-0">
      <Card className="p-3">
        <FavoritesCard />
      </Card>

      <Card className="p-3">
        <h2 className="mb-2 text-body font-semibold">{t("numberSearch")}</h2>
        <NumberSearch />
      </Card>

      <Card aria-disabled="true" className="flex gap-2 p-3 text-meta text-black/60">
        <Bell aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
        {t("alertsSoon")}
      </Card>

      <Card className="p-3">
        <h2 className="mb-2 text-body font-semibold">{t("otherCities")}</h2>
        <ul className="max-h-72 overflow-y-auto pr-1 text-meta">
          {cities
            .filter((city) => city.slug !== currentCity)
            .map((city) => (
              <li key={city.slug}>
                <Link href={`/${city.slug}`} className="inline-block py-1 font-normal">
                  {city.name}
                </Link>
              </li>
            ))}
        </ul>
      </Card>
    </aside>
  );
}
