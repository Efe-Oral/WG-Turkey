"use client";

import clsx from "clsx";
import {
  Camera,
  CircleDollarSign,
  FileText,
  Flag,
  Home,
  ListChecks,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CityCombobox } from "@/components/listings/CityCombobox";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Radio } from "@/components/ui/Choice";
import { TextInput } from "@/components/ui/TextInput";
import { Toggle } from "@/components/ui/Toggle";
import { formatCurrency } from "@/lib/format";
import {
  EXTRA_HOUSEHOLD_TYPES,
  FLOORS,
  HOUSEHOLD_TYPES,
  ROOM_LAYOUTS,
} from "@/lib/listings/constants";
import { publishListing, saveListing } from "@/lib/listings/mutations";
import {
  checkPublishable,
  computeTotal,
  countWords,
  listingRowSchema,
  type ListingFormValues,
} from "@/lib/listings/schema";
import { createClient } from "@/lib/supabase/client";
import { LocationPicker } from "./LocationPicker";
import { PhotoUploader, type UploadedPhoto } from "./PhotoUploader";

const AUTOSAVE_MS = 10_000;
const TITLE_MAX = 80;

const SECTIONS = [
  { id: "baslangic", key: "sectionStart", icon: Flag },
  { id: "konum", key: "sectionLocation", icon: MapPin },
  { id: "ev", key: "sectionHome", icon: Home },
  { id: "maliyet", key: "sectionCost", icon: CircleDollarSign },
  { id: "ev-arkadasi", key: "sectionRoommate", icon: Users },
  { id: "aciklama", key: "sectionDescription", icon: FileText },
  { id: "ozellikler", key: "sectionFeatures", icon: ListChecks },
  { id: "fotograflar", key: "sectionPhotos", icon: Camera },
  { id: "iletisim", key: "sectionContact", icon: Phone },
] as const;

const DESCRIPTION_TABS = [
  { field: "desc_room", label: "tabRoom" },
  { field: "desc_location", label: "tabLocation" },
  { field: "desc_household", label: "tabHousehold" },
  { field: "desc_other", label: "tabOther" },
] as const;

const AMENITIES = [
  "washing_machine",
  "dishwasher",
  "balcony",
  "elevator",
  "parking",
  "garden",
  "terrace",
  "pets_allowed",
  "accessible",
  "air_conditioning",
  "internet_included",
];

const LANGUAGES = ["tr", "en", "de", "fr", "ar", "ru"];

type Option = { value: string; label: string };

type SelectFieldProps = ComponentProps<"select"> & {
  label: string;
  required?: boolean;
  options: Option[];
  placeholder: string;
  error?: string;
};

function SelectField({
  label,
  required,
  options,
  placeholder,
  error,
  id,
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? `field-${props.name}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-meta font-semibold">
        {label}
        {required ? " *" : ""}
      </label>
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={clsx(
          "h-11 w-full rounded-input border bg-white px-3 text-body",
          error ? "border-error" : "border-black/20",
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-meta text-error">{error}</p> : null}
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-4 p-4 md:p-6">
      <h2 className="mb-4 text-h2 font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

type ListingFormProps = {
  ownerId: string;
  cities: { id: string; name: string; slug: string }[];
  initialValues: ListingFormValues;
  initialPhotos: UploadedPhoto[];
  listingId: string | null;
  isLive: boolean;
  /** Without verification, anyone could publish a stranger's number. */
  showPhoneOption: boolean;
};

export function ListingForm({
  ownerId,
  cities,
  initialValues,
  initialPhotos,
  listingId: initialListingId,
  isLive,
  showPhoneOption,
}: ListingFormProps) {
  const t = useTranslations("form");
  const enums = useTranslations("enums");
  const router = useRouter();

  const { register, setValue, getValues, control } =
    useForm<ListingFormValues>({ defaultValues: initialValues });
  const values = useWatch({ control }) as ListingFormValues;

  const listingId = useRef(initialListingId);
  const lastSaved = useRef(JSON.stringify(initialValues));
  const saving = useRef<Promise<string | null> | null>(null);

  const [photos, setPhotos] = useState(initialPhotos);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<(typeof DESCRIPTION_TABS)[number]["field"]>("desc_room");
  const [moreTypes, setMoreTypes] = useState(
    initialValues.household_types.some((type) =>
      (EXTRA_HOUSEHOLD_TYPES as readonly string[]).includes(type),
    ),
  );
  const [districts, setDistricts] = useState<
    { id: string; name: string; lat: number; lng: number }[]
  >([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const provinceId = values.province_id;
  const districtId = values.district_id;
  const isRoom = values.category === "room";

  useEffect(() => {
    if (!provinceId) return;
    let cancelled = false;

    void createClient()
      .from("districts")
      .select("id, name, lat, lng")
      .eq("province_id", provinceId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setDistricts(
          [...data].sort((a, b) => a.name.localeCompare(b.name, "tr")),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [provinceId]);

  useEffect(() => {
    if (!districtId) return;
    let cancelled = false;

    void createClient()
      .from("public_listings")
      .select("neighborhood")
      .eq("district_id", districtId)
      .limit(200)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSuggestions([
          ...new Set(
            data
              .map((row) => row.neighborhood as string | null)
              .filter((name): name is string => Boolean(name)),
          ),
        ]);
      });

    return () => {
      cancelled = true;
    };
  }, [districtId]);

  /** Saves if anything changed, and returns the listing id. */
  const save = useCallback(async (): Promise<string | null> => {
    if (saving.current) await saving.current;

    const current = getValues();
    const serialized = JSON.stringify(current);
    if (serialized === lastSaved.current && listingId.current) {
      return listingId.current;
    }

    const task = saveListing(listingId.current, current).then((result) => {
      if (!result.ok) return null;
      listingId.current = result.id;
      lastSaved.current = serialized;
      return result.id;
    });

    saving.current = task;
    const id = await task;
    saving.current = null;
    return id;
  }, [getValues]);

  const autosave = useCallback(() => {
    const isDirty = JSON.stringify(getValues()) !== lastSaved.current;
    if (isLive || !isDirty) return;

    void save().then((id) => {
      if (id) setStatus(t("draftSaved"));
    });
  }, [getValues, isLive, save, t]);

  useEffect(() => {
    const timer = setInterval(autosave, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [autosave]);

  const fieldError = (field: keyof ListingFormValues | "photos") => {
    const code = errors[field];
    return code ? t(`errors.${code}` as "errors.required") : undefined;
  };

  const showErrors = (list: { field: string; code: string }[]) => {
    const next = Object.fromEntries(list.map((item) => [item.field, item.code]));
    setErrors(next);
    setStatus(t("fixErrors"));

    const first = list[0]?.field;
    if (first) {
      const target =
        document.querySelector(`[name="${first}"]`) ??
        document.getElementById("fotograflar");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const onPublish = async () => {
    const parsed = listingRowSchema.safeParse(getValues());
    if (!parsed.success) {
      setStatus(t("saveFailed"));
      return;
    }

    const problems = checkPublishable(parsed.data, photos.length);
    if (problems.length > 0) {
      showErrors(problems);
      return;
    }

    setBusy(true);
    setErrors({});
    const id = await save();
    const result = id
      ? await publishListing(id, getValues())
      : { ok: false as const, errors: [] };
    setBusy(false);

    if (result.ok) {
      router.push(
        `/ilan-ver/tamamlandi?ilan=${result.publicNumber}&durum=${result.status}`,
      );
    } else if (result.errors.length > 0) {
      showErrors(result.errors);
    } else {
      setStatus(t("saveFailed"));
    }
  };

  const onSaveClick = async () => {
    setBusy(true);
    const id = await save();
    setBusy(false);
    setStatus(
      id ? t(isLive ? "changesSaved" : "draftSaved") : t("saveFailed"),
    );
    if (id && isLive) router.refresh();
  };

  const toggleInList = (
    field: "languages" | "household_types" | "bathroom" | "amenities",
    item: string,
    checked: boolean,
  ) => {
    const current = getValues(field);
    setValue(
      field,
      checked ? [...current, item] : current.filter((entry) => entry !== item),
      { shouldDirty: true },
    );
  };

  const selectedCity = cities.find((city) => city.id === provinceId);
  const selectedDistrict = districts.find((item) => item.id === districtId);
  const pinCenter = useMemo(
    () =>
      selectedDistrict
        ? { lat: selectedDistrict.lat, lng: selectedDistrict.lng }
        : null,
    [selectedDistrict],
  );
  const pin = useMemo(
    () =>
      values.lat !== null && values.lng !== null
        ? { lat: values.lat, lng: values.lng }
        : null,
    [values.lat, values.lng],
  );

  const totalWords = countWords(DESCRIPTION_TABS.map(({ field }) => values[field]));
  const total = computeTotal(values);

  const floorOption = (floor: string): Option => ({
    value: floor,
    label: /^\d/.test(floor)
      ? floor
      : floor === "30+"
        ? floor
        : enums(`floor.${floor as "basement"}`),
  });

  const choices = (
    prefix: "buildingType" | "heating" | "flooring" | "internet",
    keys: string[],
  ): Option[] =>
    keys.map((key) => ({
      value: key,
      label: enums(`${prefix}.${key}` as "heating.combi"),
    }));

  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      onBlur={autosave}
      className="mx-auto flex max-w-page flex-col gap-6 px-4 py-6 md:flex-row md:px-6"
    >
      <nav
        aria-label={t("sectionsLabel")}
        className="hidden md:block md:w-56 md:shrink-0"
      >
        <ul className="sticky top-4 flex flex-col gap-1">
          {SECTIONS.filter((section) => isRoom || section.id !== "ev-arkadasi").map(
            ({ id, key, icon: Icon }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="flex items-center gap-2 rounded-input px-3 py-2 font-normal hover:bg-black/4 hover:no-underline"
                >
                  <Icon aria-hidden="true" size={18} />
                  {t(key)}
                </a>
              </li>
            ),
          )}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <h1 className="text-h1 font-semibold">
          {initialListingId ? t("editTitle") : t("pageTitle")}
        </h1>

        <Section id="baslangic" title={t("sectionStart")}>
          <div className="flex flex-col gap-4">
            <div>
              <TextInput
                label={`${t("title")} *`}
                maxLength={TITLE_MAX}
                error={fieldError("title")}
                {...register("title")}
              />
              <p className="mt-1 text-right text-small text-black/60 tabular-nums">
                {t("titleCounter", { count: TITLE_MAX - values.title.length })}
              </p>
            </div>
            <CityCombobox
              cities={cities}
              value={selectedCity?.slug}
              onSelect={(slug) => {
                const city = cities.find((item) => item.slug === slug);
                setValue("province_id", city?.id ?? "");
                setValue("district_id", "");
                setDistricts([]);
                setSuggestions([]);
              }}
            />
            {errors.province_id ? (
              <p className="-mt-3 text-meta text-error">{fieldError("province_id")}</p>
            ) : null}
            <fieldset>
              <legend className="mb-1 text-meta font-semibold">{t("category")} *</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {(["room", "studio", "flat"] as const).map((category) => (
                  <Radio
                    key={category}
                    value={category}
                    label={enums(`category.${category}`)}
                    {...register("category")}
                  />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-meta font-semibold">{t("term")} *</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {(["open_ended", "fixed"] as const).map((term) => (
                  <Radio
                    key={term}
                    value={term}
                    label={enums(`term.${term}`)}
                    {...register("rental_term")}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        </Section>

        <Section id="konum" title={t("sectionLocation")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label={t("district")}
              required
              placeholder={t("districtPlaceholder")}
              options={districts.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              error={fieldError("district_id")}
              {...register("district_id")}
            />
            <TextInput
              label={`${t("neighborhood")} *`}
              list="neighborhood-suggestions"
              error={fieldError("neighborhood")}
              {...register("neighborhood")}
            />
            <datalist id="neighborhood-suggestions">
              {suggestions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <TextInput
              label={`${t("street")} *`}
              error={fieldError("street")}
              {...register("street")}
            />
            <div>
              <TextInput label={t("buildingNo")} {...register("building_no")} />
              <p className="mt-1 text-small text-black/60">{t("buildingNoHelp")}</p>
            </div>
            <TextInput label={t("postalCode")} {...register("postal_code")} />
          </div>
          <p className="mt-4 mb-2 text-meta text-black/60">{t("mapHelp")}</p>
          <LocationPicker
            label={t("mapLabel")}
            center={pinCenter}
            value={pin}
            onChange={({ lat, lng }) => {
              setValue("lat", lat);
              setValue("lng", lng);
            }}
          />
        </Section>

        <Section id="ev" title={t("sectionHome")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <TextInput
                label={`${t("availableFrom")} *`}
                type="date"
                error={fieldError("available_from")}
                {...register("available_from")}
              />
              <button
                type="button"
                onClick={() =>
                  setValue("available_from", new Date().toISOString().slice(0, 10))
                }
                className="mt-1 cursor-pointer text-meta font-medium underline"
              >
                {t("today")}
              </button>
            </div>
            <TextInput
              label={`${t("availableTo")}${values.rental_term === "fixed" ? " *" : ""}`}
              type="date"
              error={fieldError("available_to")}
              {...register("available_to")}
            />
            <SelectField
              label={t("buildingType")}
              placeholder={t("select")}
              options={choices("buildingType", [
                "apartment",
                "complex",
                "detached",
                "residence",
              ])}
              {...register("building_type")}
            />
            <SelectField
              label={t("floor")}
              placeholder={t("select")}
              options={FLOORS.map(floorOption)}
              {...register("floor")}
            />
            {isRoom ? (
              <TextInput
                label={`${t("roomSize")} *`}
                type="number"
                min={1}
                error={fieldError("room_size_m2")}
                {...register("room_size_m2")}
              />
            ) : null}
            <TextInput
              label={`${t("flatSize")}${isRoom ? "" : " *"}`}
              type="number"
              min={1}
              error={fieldError("flat_size_m2")}
              {...register("flat_size_m2")}
            />
            {values.category === "flat" ? (
              <SelectField
                label={t("layout")}
                placeholder={t("select")}
                options={ROOM_LAYOUTS.map((layout) => ({
                  value: layout,
                  label: layout,
                }))}
                {...register("room_layout")}
              />
            ) : null}
            <TextInput
              label={t("transit")}
              type="number"
              min={0}
              {...register("transit_walk_min")}
            />
            <SelectField
              label={t("buildingAge")}
              placeholder={t("select")}
              options={["0-5", "5-10", "10-20", "20+"].map((age) => ({
                value: age,
                label: age,
              }))}
              {...register("building_age")}
            />
          </div>
        </Section>

        <Section id="maliyet" title={t("sectionCost")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              label={`${t("rent")} *`}
              type="number"
              min={0}
              error={fieldError("rent")}
              {...register("rent")}
            />
            <TextInput label={t("dues")} type="number" min={0} {...register("dues")} />
            <TextInput
              label={t("utilities")}
              type="number"
              min={0}
              {...register("utilities_estimate")}
            />
            <TextInput
              label={t("otherCosts")}
              type="number"
              min={0}
              {...register("other_costs")}
            />
            <TextInput
              label={t("deposit")}
              type="number"
              min={0}
              {...register("deposit")}
            />
          </div>
          <div className="mt-3">
            <Checkbox label={t("utilitiesIncluded")} {...register("utilities_included")} />
          </div>
          <p className="mt-3 rounded-card bg-graphite px-4 py-3 text-white tabular-nums">
            {t("total")}: <strong>{formatCurrency(total)}</strong>
          </p>
        </Section>

        {isRoom ? (
          <Section id="ev-arkadasi" title={t("sectionRoommate")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <SelectField
                  label={t("household")}
                  required
                  placeholder={t("select")}
                  options={[2, 3, 4, 5, 6, 7, 8].map((size) => ({
                    value: String(size),
                    label: size === 8 ? "8+" : String(size),
                  }))}
                  error={fieldError("household_size")}
                  {...register("household_size")}
                />
                <p className="mt-1 text-small text-black/60">{t("householdHelp")}</p>
              </div>
              <TextInput
                label={t("residentsFemale")}
                type="number"
                min={0}
                {...register("residents_female")}
              />
              <TextInput
                label={`${t("residentsMale")} *`}
                type="number"
                min={0}
                error={fieldError("residents_male")}
                {...register("residents_male")}
              />
              <TextInput
                label={t("residentsAgeMin")}
                type="number"
                min={0}
                {...register("residents_age_min")}
              />
              <TextInput
                label={t("residentsAgeMax")}
                type="number"
                min={0}
                {...register("residents_age_max")}
              />
              <SelectField
                label={t("wantedGender")}
                required
                placeholder={t("select")}
                options={(["any", "female", "male"] as const).map((gender) => ({
                  value: gender,
                  label: enums(`gender.${gender}`),
                }))}
                error={fieldError("wanted_gender")}
                {...register("wanted_gender")}
              />
              <TextInput
                label={t("wantedAgeMin")}
                type="number"
                min={0}
                {...register("wanted_age_min")}
              />
              <TextInput
                label={t("wantedAgeMax")}
                type="number"
                min={0}
                {...register("wanted_age_max")}
              />
              <SelectField
                label={t("smoking")}
                placeholder={t("select")}
                options={(["allowed", "balcony", "not_allowed"] as const).map(
                  (policy) => ({
                    value: policy,
                    label: enums(`smoking.${policy}`),
                  }),
                )}
                {...register("smoking")}
              />
            </div>
            <div className="mt-3">
              <Checkbox label={t("hasPets")} {...register("has_pets")} />
            </div>
            <fieldset className="mt-4">
              <legend className="mb-1 text-meta font-semibold">{t("languages")}</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {LANGUAGES.map((language) => (
                  <Checkbox
                    key={language}
                    label={enums(`language.${language}` as "language.tr")}
                    checked={values.languages.includes(language)}
                    onChange={(event) =>
                      toggleInList("languages", language, event.target.checked)
                    }
                  />
                ))}
              </div>
            </fieldset>
            <fieldset className="mt-4">
              <legend className="mb-1 text-meta font-semibold">{t("houseType")} *</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {[
                  ...HOUSEHOLD_TYPES,
                  ...(moreTypes ? EXTRA_HOUSEHOLD_TYPES : []),
                ].map((type) => (
                  <Checkbox
                    key={type}
                    label={enums(`houseType.${type}`)}
                    checked={values.household_types.includes(type)}
                    onChange={(event) =>
                      toggleInList("household_types", type, event.target.checked)
                    }
                  />
                ))}
              </div>
              {!moreTypes ? (
                <button
                  type="button"
                  onClick={() => setMoreTypes(true)}
                  className="mt-2 cursor-pointer text-meta font-medium underline"
                >
                  {t("moreTypes")}
                </button>
              ) : null}
              {errors.household_types ? (
                <p className="mt-1 text-meta text-error">
                  {fieldError("household_types")}
                </p>
              ) : null}
            </fieldset>
          </Section>
        ) : null}

        <Section id="aciklama" title={t("sectionDescription")}>
          <div role="tablist" aria-label={t("descLabel")} className="flex flex-wrap gap-1 border-b border-black/12">
            {DESCRIPTION_TABS.filter(
              ({ field }) => isRoom || field !== "desc_household",
            ).map(({ field, label }) => (
              <button
                key={field}
                type="button"
                role="tab"
                aria-selected={tab === field}
                onClick={() => setTab(field)}
                className={clsx(
                  "flex cursor-pointer items-center gap-2 rounded-t-card px-4 py-2 font-medium",
                  tab === field ? "bg-cyan" : "hover:bg-black/4",
                )}
              >
                {t(label)}
                <span className="rounded-pill bg-white px-1.5 text-small tabular-nums">
                  {countWords([values[field]])}
                </span>
              </button>
            ))}
          </div>
          {DESCRIPTION_TABS.map(({ field, label }) => (
            <textarea
              key={field}
              aria-label={t(label)}
              rows={8}
              hidden={tab !== field}
              className="mt-3 w-full rounded-input border border-black/20 bg-white p-3 text-body"
              {...register(field)}
            />
          ))}
          <p className="mt-2 text-meta font-semibold tabular-nums">
            {t("wordCount", { count: totalWords })}
          </p>
          <p className="text-meta text-black/60">{t("wordHelp")}</p>
          {errors.desc_room ? (
            <p className="mt-1 text-meta text-error">{fieldError("desc_room")}</p>
          ) : null}
        </Section>

        <Section id="ozellikler" title={t("sectionFeatures")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              label={t("furnishing")}
              placeholder={t("none")}
              options={(["furnished", "partial", "unfurnished"] as const).map(
                (value) => ({ value, label: enums(`furnishing.${value}`) }),
              )}
              {...register("furnishing")}
            />
            <SelectField
              label={t("heating")}
              placeholder={t("none")}
              options={choices("heating", [
                "combi",
                "central",
                "stove",
                "ac",
                "underfloor",
              ])}
              {...register("heating")}
            />
            <SelectField
              label={t("flooring")}
              placeholder={t("none")}
              options={choices("flooring", [
                "laminate",
                "parquet",
                "ceramic",
                "carpet",
              ])}
              {...register("flooring")}
            />
            <SelectField
              label={t("internet")}
              placeholder={t("none")}
              options={choices("internet", ["fiber", "adsl", "none"])}
              {...register("internet_type")}
            />
            <SelectField
              label={t("internetSpeed")}
              placeholder={t("none")}
              options={["25", "50", "100", "1000"].map((speed) => ({
                value: speed,
                label: `${speed} Mbit`,
              }))}
              {...register("internet_speed")}
            />
          </div>
          <fieldset className="mt-4">
            <legend className="mb-1 text-meta font-semibold">{t("bathroom")}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(["tub", "shower", "private"] as const).map((item) => (
                <Checkbox
                  key={item}
                  label={enums(`bathroom.${item}`)}
                  checked={values.bathroom.includes(item)}
                  onChange={(event) =>
                    toggleInList("bathroom", item, event.target.checked)
                  }
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="mb-1 text-meta font-semibold">{t("other")}</legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {AMENITIES.map((amenity) => (
                <Checkbox
                  key={amenity}
                  label={enums(`amenity.${amenity}` as "amenity.balcony")}
                  checked={values.amenities.includes(amenity)}
                  onChange={(event) =>
                    toggleInList("amenities", amenity, event.target.checked)
                  }
                />
              ))}
            </div>
          </fieldset>
        </Section>

        <Section id="fotograflar" title={t("sectionPhotos")}>
          <PhotoUploader
            ownerId={ownerId}
            photos={photos}
            onChange={setPhotos}
            ensureListing={save}
            error={fieldError("photos")}
          />
        </Section>

        <Section id="iletisim" title={t("sectionContact")}>
          {showPhoneOption ? (
            <Controller
              control={control}
              name="show_phone"
              render={({ field }) => (
                <Toggle
                  label={t("showPhone")}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          ) : null}
          <p className="mt-2 text-meta text-black/60">{t("contactNote")}</p>
        </Section>

        <Card className="flex flex-col gap-1 bg-black/4 p-4">
          <p className="text-meta font-semibold">{t("preview")}</p>
          <p className="truncate font-semibold">{values.title || t("title")}</p>
          <p className="text-meta text-black/60">
            {[selectedCity?.name, selectedDistrict?.name, enums(`category.${values.category}`)]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="text-price font-bold tabular-nums">{formatCurrency(total)}</p>
        </Card>

        <p role="status" className="min-h-5 text-center text-meta">
          {status}
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {isLive ? (
            <Button disabled={busy} onClick={() => void onSaveClick()}>
              {t("save")}
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void onSaveClick()}
              >
                {t("saveDraft")}
              </Button>
              <Button disabled={busy} onClick={() => void onPublish()}>
                {t("publish")}
              </Button>
            </>
          )}
        </div>
      </div>
    </form>
  );
}
