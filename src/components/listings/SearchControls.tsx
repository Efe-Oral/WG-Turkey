"use client";

import { ChevronDown, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Choice";
import { Dropdown } from "@/components/ui/Dropdown";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { formatCurrency } from "@/lib/format";
import {
  CATEGORIES,
  FLOORS,
  HOUSEHOLD_TYPES,
  MAX_RENT_STEPS,
  MIN_SIZE_STEPS,
  RENTAL_TERMS,
  ROOM_LAYOUTS,
  SEARCH_FEATURES,
  type ListingCategory,
  type RentalTerm,
} from "@/lib/listings/constants";
import {
  buildResultsHref,
  EMPTY_FILTERS,
  type SearchFilters,
} from "@/lib/listings/filters";
import { track } from "@/lib/events/client";
import { CityCombobox } from "./CityCombobox";

const ANY = "any";
const DEBOUNCE_MS = 400;
const HOUSEHOLD_SIZES = [2, 3, 4, 5, 6, 7, 8];

type SearchControlsProps = {
  cities: { name: string; slug: string }[];
  districts: { name: string; slug: string }[];
  citySlug: string;
  filters: SearchFilters;
};

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1 sm:w-44">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-small font-semibold">
          {label}
        </label>
      ) : (
        <span aria-hidden="true" className="text-small font-semibold">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

const fieldInputClasses =
  "h-10 w-full rounded-pill border border-black/20 bg-white px-4 text-body";

export function SearchControls({
  cities,
  districts,
  citySlug,
  filters,
}: SearchControlsProps) {
  const t = useTranslations("search");
  const enums = useTranslations("enums");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [draft, setDraft] = useState(filters);
  const [syncedFilters, setSyncedFilters] = useState(filters);
  const [expanded, setExpanded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Back and forward change the URL without this form, so follow it here.
  if (JSON.stringify(filters) !== JSON.stringify(syncedFilters)) {
    setSyncedFilters(filters);
    setDraft(filters);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const navigate = (next: SearchFilters, city = citySlug) => {
    clearTimeout(timer.current);
    startTransition(() => {
      router.replace(buildResultsHref(city, next), { scroll: false });
    });
  };

  // Every filter change starts again from the first page.
  const update = (patch: Partial<SearchFilters>) => {
    const next = { ...draft, ...patch, page: 1 };
    setDraft(next);
    track({ name: "filter_changed", props: { fields: Object.keys(patch).join(",") } });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate(next), DEBOUNCE_MS);
  };

  const single = (value: string) => (value === ANY ? undefined : value);
  const number = (value: string) => {
    const parsed = Number(value);
    return value === ANY || !Number.isInteger(parsed) || parsed <= 0
      ? undefined
      : parsed;
  };

  const anyOption = { value: ANY, label: t("any") };

  const categoryOptions = CATEGORIES.map((category) => ({
    value: category,
    label: enums(`category.${category}`),
  }));
  const termOptions = RENTAL_TERMS.map((term) => ({
    value: term,
    label: enums(`term.${term}`),
  }));
  const floorLabel = (floor: string) =>
    /^\d/.test(floor)
      ? enums("floorNumber", { floor })
      : enums(`floor.${floor as "basement" | "ground" | "garden"}`);

  return (
    <div aria-busy={isPending}>
      <Card className="p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ ...draft, page: 1 });
          }}
          className="flex flex-col gap-3 md:flex-row md:items-end"
        >
          <CityCombobox
            cities={cities}
            value={citySlug}
            onSelect={(slug) =>
              navigate({ ...EMPTY_FILTERS, categories: draft.categories }, slug)
            }
            className="md:w-56"
          />
          <div className="flex flex-col gap-1 md:flex-1">
            <span aria-hidden="true" className="text-meta font-semibold">
              {t("category")}
            </span>
            <MultiSelect
              label={t("category")}
              placeholder={t("any")}
              selectedLabel={t("selected", { count: draft.categories.length })}
              options={categoryOptions}
              value={draft.categories}
              onValueChange={(value) =>
                update({ categories: value as ListingCategory[] })
              }
            />
          </div>
          <div className="flex flex-col gap-1 md:w-40">
            <span aria-hidden="true" className="text-meta font-semibold">
              {t("term")}
            </span>
            <MultiSelect
              label={t("term")}
              placeholder={t("any")}
              selectedLabel={t("selected", { count: draft.terms.length })}
              options={termOptions}
              value={draft.terms}
              onValueChange={(value) =>
                update({ terms: value as RentalTerm[] })
              }
            />
          </div>
          <div className="flex flex-col gap-1 md:w-32">
            <span aria-hidden="true" className="text-meta font-semibold">
              {t("minSize")}
            </span>
            <Dropdown
              label={t("minSize")}
              placeholder={t("any")}
              value={draft.minSize ? String(draft.minSize) : ""}
              onValueChange={(value) => update({ minSize: number(value) })}
              options={[
                { value: ANY, label: t("any") },
                ...MIN_SIZE_STEPS.map((size) => ({
                  value: String(size),
                  label: `${size} m²`,
                })),
              ]}
            />
          </div>
          <div className="flex flex-col gap-1 md:w-36">
            <span aria-hidden="true" className="text-meta font-semibold">
              {t("maxRent")}
            </span>
            <Dropdown
              label={t("maxRent")}
              placeholder={t("any")}
              value={draft.maxRent ? String(draft.maxRent) : ""}
              onValueChange={(value) => update({ maxRent: number(value) })}
              options={[
                { value: ANY, label: t("any") },
                ...MAX_RENT_STEPS.map((rent) => ({
                  value: String(rent),
                  label: formatCurrency(rent),
                })),
              ]}
            />
          </div>
          <Button
            type="submit"
            variant="dark"
            aria-label={t("searchButton")}
            className="w-full px-0! md:h-10 md:w-10 md:shrink-0"
          >
            <Search aria-hidden="true" size={20} />
          </Button>
        </form>
      </Card>

      <section
        aria-label={t("filtersLabel")}
        className="mt-3 flex flex-col gap-3 rounded-card bg-black/4 p-3"
      >
        <div className="flex flex-wrap items-end gap-3">
          {districts.length > 0 ? (
            <Field label={t("district")}>
              <MultiSelect
                label={t("district")}
                placeholder={t("any")}
                selectedLabel={t("selected", { count: draft.districts.length })}
                options={districts.map((district) => ({
                  value: district.slug,
                  label: district.name,
                }))}
                value={draft.districts}
                onValueChange={(value) => update({ districts: value })}
              />
            </Field>
          ) : null}
          <Field label={t("from")} htmlFor="filter-from">
            <input
              id="filter-from"
              type="date"
              value={draft.from ?? ""}
              onChange={(event) =>
                update({ from: event.target.value || undefined })
              }
              className={fieldInputClasses}
            />
          </Field>
          <Field label={t("to")} htmlFor="filter-to">
            <input
              id="filter-to"
              type="date"
              value={draft.to ?? ""}
              onChange={(event) =>
                update({ to: event.target.value || undefined })
              }
              className={fieldInputClasses}
            />
          </Field>
          <Field label={t("houseType")}>
            <MultiSelect
              label={t("houseType")}
              placeholder={t("any")}
              selectedLabel={t("selected", { count: draft.houseTypes.length })}
              options={HOUSEHOLD_TYPES.map((type) => ({
                value: type,
                label: enums(`houseType.${type}`),
              }))}
              value={draft.houseTypes}
              onValueChange={(value) => update({ houseTypes: value })}
            />
          </Field>
          <Field label={t("residents")}>
            <Dropdown
              label={t("residents")}
              placeholder={t("any")}
              value={draft.residents ?? ""}
              onValueChange={(value) =>
                update({
                  residents: single(value) as SearchFilters["residents"],
                })
              }
              options={[
                anyOption,
                { value: "female", label: enums("residents.female") },
                { value: "male", label: enums("residents.male") },
                { value: "mixed", label: enums("residents.mixed") },
              ]}
            />
          </Field>
          <Field label={t("wantedGender")}>
            <Dropdown
              label={t("wantedGender")}
              placeholder={t("any")}
              value={draft.gender ?? ""}
              onValueChange={(value) =>
                update({ gender: single(value) as SearchFilters["gender"] })
              }
              options={[
                anyOption,
                { value: "female", label: enums("gender.female") },
                { value: "male", label: enums("gender.male") },
              ]}
            />
          </Field>
          <Field label={t("myAge")} htmlFor="filter-age">
            <input
              id="filter-age"
              type="number"
              inputMode="numeric"
              min={16}
              max={99}
              value={draft.age ?? ""}
              onChange={(event) =>
                update({ age: number(event.target.value) })
              }
              className={fieldInputClasses}
            />
          </Field>
        </div>

        {expanded ? (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <Field label={t("householdMin")}>
                <Dropdown
                  label={t("householdMin")}
                  placeholder={t("any")}
                  value={draft.householdMin ? String(draft.householdMin) : ""}
                  onValueChange={(value) =>
                    update({ householdMin: number(value) })
                  }
                  options={[
                    anyOption,
                    ...HOUSEHOLD_SIZES.map((size) => ({
                      value: String(size),
                      label: String(size),
                    })),
                  ]}
                />
              </Field>
              <Field label={t("householdMax")}>
                <Dropdown
                  label={t("householdMax")}
                  placeholder={t("any")}
                  value={draft.householdMax ? String(draft.householdMax) : ""}
                  onValueChange={(value) =>
                    update({ householdMax: number(value) })
                  }
                  options={[
                    anyOption,
                    ...HOUSEHOLD_SIZES.map((size) => ({
                      value: String(size),
                      label: String(size),
                    })),
                  ]}
                />
              </Field>
              <Field label={t("smoking")}>
                <Dropdown
                  label={t("smoking")}
                  placeholder={t("any")}
                  value={draft.smoking ?? ""}
                  onValueChange={(value) =>
                    update({
                      smoking: single(value) as SearchFilters["smoking"],
                    })
                  }
                  options={[
                    anyOption,
                    { value: "allowed", label: enums("smoking.allowed") },
                    { value: "balcony", label: enums("smoking.balcony") },
                    {
                      value: "not_allowed",
                      label: enums("smoking.not_allowed"),
                    },
                  ]}
                />
              </Field>
              <Field label={t("furnishing")}>
                <Dropdown
                  label={t("furnishing")}
                  placeholder={t("any")}
                  value={draft.furnishing ?? ""}
                  onValueChange={(value) =>
                    update({
                      furnishing: single(value) as SearchFilters["furnishing"],
                    })
                  }
                  options={[
                    anyOption,
                    { value: "furnished", label: enums("furnishing.furnished") },
                    { value: "partial", label: enums("furnishing.partial") },
                    {
                      value: "unfurnished",
                      label: enums("furnishing.unfurnished"),
                    },
                  ]}
                />
              </Field>
              <Field label={t("posted")}>
                <Dropdown
                  label={t("posted")}
                  placeholder={t("any")}
                  value={draft.postedWithin ? String(draft.postedWithin) : ""}
                  onValueChange={(value) =>
                    update({
                      postedWithin: number(value) as SearchFilters["postedWithin"],
                    })
                  }
                  options={[
                    anyOption,
                    { value: "1", label: enums("posted.1") },
                    { value: "3", label: enums("posted.3") },
                    { value: "7", label: enums("posted.7") },
                  ]}
                />
              </Field>
              <Field label={t("floor")}>
                <Dropdown
                  label={t("floor")}
                  placeholder={t("any")}
                  value={draft.floor ?? ""}
                  onValueChange={(value) => update({ floor: single(value) })}
                  options={[
                    anyOption,
                    ...FLOORS.slice(0, 13).map((floor) => ({
                      value: floor,
                      label: floorLabel(floor),
                    })),
                  ]}
                />
              </Field>
              <Field label={t("layout")}>
                <MultiSelect
                  label={t("layout")}
                  placeholder={t("any")}
                  selectedLabel={t("selected", { count: draft.layouts.length })}
                  options={ROOM_LAYOUTS.map((layout) => ({
                    value: layout,
                    label: layout,
                  }))}
                  value={draft.layouts}
                  onValueChange={(value) => update({ layouts: value })}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Checkbox
                label={t("petsAllowed")}
                checked={Boolean(draft.pets)}
                onChange={(event) =>
                  update({ pets: event.target.checked ? true : undefined })
                }
              />
              {SEARCH_FEATURES.map((feature) => (
                <Checkbox
                  key={feature}
                  label={enums(`feature.${feature}`)}
                  checked={draft.features.includes(feature)}
                  onChange={(event) =>
                    update({
                      features: event.target.checked
                        ? [...draft.features, feature]
                        : draft.features.filter((item) => item !== feature),
                    })
                  }
                />
              ))}
            </div>
          </>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            className="inline-flex cursor-pointer items-center gap-1 font-medium hover:underline"
          >
            {expanded ? t("lessFilters") : t("moreFilters")}
            <ChevronDown
              aria-hidden="true"
              size={16}
              className={expanded ? "rotate-180" : undefined}
            />
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                const cleared = { ...EMPTY_FILTERS };
                setDraft(cleared);
                navigate(cleared);
              }}
              className="cursor-pointer font-medium hover:underline"
            >
              {t("clear")}
            </button>
            <Button compact onClick={() => navigate({ ...draft, page: 1 })}>
              {t("apply")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
