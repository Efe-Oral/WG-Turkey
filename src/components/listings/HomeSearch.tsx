"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { CATEGORIES, type ListingCategory } from "@/lib/listings/constants";
import { buildResultsHref, EMPTY_FILTERS } from "@/lib/listings/filters";
import { CityCombobox } from "./CityCombobox";

type HomeSearchProps = {
  cities: { name: string; slug: string }[];
  initialCity: string;
};

export function HomeSearch({ cities, initialCity }: HomeSearchProps) {
  const t = useTranslations("search");
  const enums = useTranslations("enums");
  const router = useRouter();
  const [city, setCity] = useState(initialCity);
  const [categories, setCategories] = useState<ListingCategory[]>([]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        router.push(buildResultsHref(city, { ...EMPTY_FILTERS, categories }));
      }}
      className="flex flex-col gap-3 md:flex-row md:items-end"
    >
      <CityCombobox
        cities={cities}
        value={city}
        onSelect={setCity}
        className="md:flex-1"
      />
      <div className="flex flex-col gap-1 md:flex-1">
        <span aria-hidden="true" className="text-meta font-semibold">
          {t("category")}
        </span>
        <MultiSelect
          label={t("category")}
          placeholder={t("any")}
          selectedLabel={t("selected", { count: categories.length })}
          value={categories}
          onValueChange={(value) => setCategories(value as ListingCategory[])}
          options={CATEGORIES.map((category) => ({
            value: category,
            label: enums(`category.${category}`),
          }))}
        />
      </div>
      <Button type="submit" variant="dark" compact>
        <Search aria-hidden="true" size={18} />
        {t("searchButton")}
      </Button>
    </form>
  );
}
