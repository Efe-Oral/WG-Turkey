import { z } from "zod";

/** What the form holds: every number is still a string while typing. */
export type ListingFormValues = {
  title: string;
  category: "room" | "studio" | "flat";
  rental_term: "open_ended" | "fixed";
  province_id: string;
  district_id: string;
  neighborhood: string;
  street: string;
  building_no: string;
  postal_code: string;
  lat: number | null;
  lng: number | null;
  available_from: string;
  available_to: string;
  building_type: string;
  floor: string;
  room_size_m2: string;
  flat_size_m2: string;
  room_layout: string;
  transit_walk_min: string;
  building_age: string;
  rent: string;
  dues: string;
  utilities_estimate: string;
  other_costs: string;
  deposit: string;
  utilities_included: boolean;
  household_size: string;
  residents_female: string;
  residents_male: string;
  residents_age_min: string;
  residents_age_max: string;
  wanted_gender: string;
  wanted_age_min: string;
  wanted_age_max: string;
  smoking: string;
  has_pets: boolean;
  languages: string[];
  household_types: string[];
  desc_room: string;
  desc_location: string;
  desc_household: string;
  desc_other: string;
  furnishing: string;
  heating: string;
  internet_type: string;
  internet_speed: string;
  bathroom: string[];
  flooring: string;
  amenities: string[];
  show_phone: boolean;
};

export const EMPTY_FORM: ListingFormValues = {
  title: "",
  category: "room",
  rental_term: "open_ended",
  province_id: "",
  district_id: "",
  neighborhood: "",
  street: "",
  building_no: "",
  postal_code: "",
  lat: null,
  lng: null,
  available_from: "",
  available_to: "",
  building_type: "",
  floor: "",
  room_size_m2: "",
  flat_size_m2: "",
  room_layout: "",
  transit_walk_min: "",
  building_age: "",
  rent: "",
  dues: "",
  utilities_estimate: "",
  other_costs: "",
  deposit: "",
  utilities_included: false,
  household_size: "",
  residents_female: "",
  residents_male: "",
  residents_age_min: "",
  residents_age_max: "",
  wanted_gender: "",
  wanted_age_min: "",
  wanted_age_max: "",
  smoking: "",
  has_pets: false,
  languages: [],
  household_types: [],
  desc_room: "",
  desc_location: "",
  desc_household: "",
  desc_other: "",
  furnishing: "",
  heating: "",
  internet_type: "",
  internet_speed: "",
  bathroom: [],
  flooring: "",
  amenities: [],
  show_phone: false,
};

const blankToNull = (value: unknown) =>
  value === "" || value === undefined ? null : value;

const text = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable());

const integer = (max: number) =>
  z.preprocess(
    blankToNull,
    z.coerce.number().int().min(0).max(max).nullable(),
  );

const uuid = z.preprocess(blankToNull, z.uuid().nullable());
const date = z.preprocess(blankToNull, z.iso.date().nullable());
const coordinate = (limit: number) =>
  z.number().min(-limit).max(limit).nullable();
const choice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(blankToNull, z.enum(values).nullable());
const tags = z.array(z.string().max(40)).max(30);

/** Turns form values into a database row. Used for drafts, so all optional. */
export const listingRowSchema = z.object({
  title: z.string().trim().max(80),
  category: z.enum(["room", "studio", "flat"]),
  rental_term: z.enum(["open_ended", "fixed"]),
  province_id: uuid,
  district_id: uuid,
  neighborhood: text(120),
  street: text(160),
  building_no: text(20),
  postal_code: text(10),
  lat: coordinate(90),
  lng: coordinate(180),
  available_from: date,
  available_to: date,
  building_type: text(40),
  floor: text(10),
  room_size_m2: integer(500),
  flat_size_m2: integer(2000),
  room_layout: text(10),
  transit_walk_min: integer(240),
  building_age: text(10),
  rent: integer(10_000_000),
  dues: integer(10_000_000),
  utilities_estimate: integer(10_000_000),
  other_costs: integer(10_000_000),
  deposit: integer(100_000_000),
  utilities_included: z.boolean(),
  household_size: integer(20),
  residents_female: integer(20),
  residents_male: integer(20),
  residents_age_min: integer(120),
  residents_age_max: integer(120),
  wanted_gender: choice(["any", "female", "male"]),
  wanted_age_min: integer(120),
  wanted_age_max: integer(120),
  smoking: choice(["allowed", "balcony", "not_allowed"]),
  has_pets: z.boolean(),
  languages: tags,
  household_types: tags,
  desc_room: text(4000),
  desc_location: text(4000),
  desc_household: text(4000),
  desc_other: text(4000),
  furnishing: choice(["furnished", "partial", "unfurnished"]),
  heating: text(20),
  internet_type: text(20),
  internet_speed: text(20),
  bathroom: tags,
  flooring: text(20),
  amenities: tags,
  show_phone: z.boolean(),
});

export type ListingRow = z.infer<typeof listingRowSchema>;

export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 20;
export const MIN_WORDS = 30;

export function countWords(texts: (string | null | undefined)[]): number {
  return texts
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export type PublishError = { field: keyof ListingFormValues | "photos"; code: string };

/** Section 5.4 requirements. Runs in the browser and again on the server. */
export function checkPublishable(
  row: ListingRow,
  photoCount: number,
): PublishError[] {
  const errors: PublishError[] = [];
  const need = (field: keyof ListingFormValues, value: unknown) => {
    if (value === null || value === undefined || value === "") {
      errors.push({ field, code: "required" });
    }
  };

  if (row.title.length < 5) errors.push({ field: "title", code: "titleShort" });
  need("province_id", row.province_id);
  need("district_id", row.district_id);
  need("neighborhood", row.neighborhood);
  need("street", row.street);
  need("available_from", row.available_from);
  need("rent", row.rent);

  if (row.rental_term === "fixed") {
    need("available_to", row.available_to);
    if (
      row.available_from &&
      row.available_to &&
      row.available_to <= row.available_from
    ) {
      errors.push({ field: "available_to", code: "endBeforeStart" });
    }
  }

  if (row.category === "room") {
    need("room_size_m2", row.room_size_m2);
    need("household_size", row.household_size);
    need("residents_male", row.residents_male);
    need("wanted_gender", row.wanted_gender);
    if (row.household_types.length === 0) {
      errors.push({ field: "household_types", code: "required" });
    }

    const residents = (row.residents_female ?? 0) + (row.residents_male ?? 0);
    if (row.household_size !== null && residents > row.household_size - 1) {
      errors.push({ field: "residents_male", code: "tooManyResidents" });
    }
  } else {
    need("flat_size_m2", row.flat_size_m2);
  }

  if (
    countWords([
      row.desc_room,
      row.desc_location,
      row.desc_household,
      row.desc_other,
    ]) < MIN_WORDS
  ) {
    errors.push({ field: "desc_room", code: "tooFewWords" });
  }

  if (photoCount < MIN_PHOTOS) {
    errors.push({ field: "photos", code: "tooFewPhotos" });
  }

  return errors;
}

/** Live "Toplam aylık maliyet" in the form. Same formula as the database. */
export function computeTotal(values: ListingFormValues): number {
  const amount = (value: string) => Number(value) || 0;

  return (
    amount(values.rent) +
    amount(values.dues) +
    amount(values.other_costs) +
    (values.utilities_included ? 0 : amount(values.utilities_estimate))
  );
}
