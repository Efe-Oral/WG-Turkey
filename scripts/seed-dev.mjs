// Fills the development database with fake data. Section 13.
//
//   npm run seed
//
// Refuses to run unless .env.local names this exact project in SEED_TARGET_REF,
// and always refuses with NODE_ENV=production. Safe to run again: it removes the
// previous fake users first, which removes everything they own.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import sharp from "sharp";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const secret = process.env.SUPABASE_SECRET_KEY ?? "";
const targetRef = process.env.SEED_TARGET_REF ?? "";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed with NODE_ENV=production.");
}
if (!targetRef || new URL(url).hostname.split(".")[0] !== targetRef) {
  throw new Error("Refusing to seed: SEED_TARGET_REF must match the project in .env.local.");
}

const db = createClient(url, secret, { auth: { persistSession: false } });
const SEED_DOMAIN = "seed.evarkadasiara.test";
const BUCKET = "listing-photos";

const must = ({ data, error }, label) => {
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

// Fixed pseudo-random numbers, so every run produces the same listings.
let state = 20261102;
const random = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const pick = (items) => items[Math.floor(random() * items.length)];
const between = (min, max) => min + Math.floor(random() * (max - min + 1));
const chance = (probability) => random() < probability;
const daysFromNow = (days) => new Date(Date.now() + days * 86_400_000);
const dateOnly = (date) => date.toISOString().slice(0, 10);

const SLUG_MAP = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };
const slugify = (text) =>
  text
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (char) => SLUG_MAP[char] ?? char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Same rule as locative() in src/lib/turkish.ts.
const locative = (name) => {
  const letters = name.toLocaleLowerCase("tr-TR");
  const vowel = [...letters].reverse().find((char) => "aıoueiöü".includes(char));
  const consonant = "fstkçşhp".includes(letters.at(-1)) ? "t" : "d";
  return `${name}'${consonant}${"aıou".includes(vowel) ? "a" : "e"}`;
};

const USERS = [
  { first: "Elif", last: "Yılmaz", gender: "female", year: 1999, status: "student" },
  { first: "Mert", last: "Kaya", gender: "male", year: 1996, status: "employed" },
  { first: "Zeynep", last: "Şahin", gender: "female", year: 2001, status: "student" },
  { first: "Can", last: "Öztürk", gender: "male", year: 1993, status: "employed" },
  { first: "Ayşe", last: "Demir", gender: "female", year: 1988, status: "other" },
];

const DISTRICTS = [
  {
    slug: "cankaya",
    lat: 39.905,
    lng: 32.86,
    weight: 3,
    rentBase: 14000,
    areas: [
      ["Bahçelievler", "7. Cadde"],
      ["Kızılay", "Sakarya Caddesi"],
      ["Tunalı Hilmi", "Bestekar Sokak"],
      ["Ayrancı", "Hoşdere Caddesi"],
      ["Kavaklıdere", "Kuğulu Sokak"],
    ],
  },
  {
    slug: "kecioren",
    lat: 39.98,
    lng: 32.865,
    weight: 2,
    rentBase: 10000,
    areas: [
      ["Etlik", "Yunus Emre Caddesi"],
      ["Bağlum", "Cumhuriyet Caddesi"],
      ["Esertepe", "Kuzgun Sokak"],
    ],
  },
  {
    slug: "yenimahalle",
    lat: 39.955,
    lng: 32.8,
    weight: 2,
    rentBase: 11000,
    areas: [
      ["Demetevler", "Vatan Caddesi"],
      ["Batıkent", "Başkent Bulvarı"],
      ["Ostim", "Uzayçağı Caddesi"],
    ],
  },
  {
    slug: "etimesgut",
    lat: 39.945,
    lng: 32.665,
    weight: 2,
    rentBase: 11500,
    areas: [
      ["Eryaman", "Süleyman Demirel Caddesi"],
      ["Elvankent", "İstasyon Caddesi"],
    ],
  },
  {
    slug: "mamak",
    lat: 39.925,
    lng: 32.92,
    weight: 1,
    rentBase: 8500,
    areas: [
      ["Kutludüğün", "Şehit Sokak"],
      ["Abidinpaşa", "Tıp Fakültesi Caddesi"],
    ],
  },
];

const AMENITIES = [
  "balcony",
  "elevator",
  "parking",
  "washing_machine",
  "dishwasher",
  "garden",
  "terrace",
  "pets_allowed",
  "accessible",
  "air_conditioning",
  "internet_included",
];

const TITLES = {
  room: [
    "metroya yakın eşyalı oda",
    "öğrenci evinde boş oda",
    "balkonlu ferah oda",
    "sessiz evde kiralık oda",
    "üniversiteye yakın oda",
  ],
  studio: ["eşyalı stüdyo daire", "merkezi konumda 1+0", "yeni binada stüdyo"],
  flat: ["kiralık aydınlık daire", "site içinde daire", "merkezi konumda daire"],
};

const DESCRIPTIONS = {
  room:
    "Oda geniş ve aydınlık. Yatak, çalışma masası ve gardırop var. Pencereden sabah güneşi alıyor, ev sessiz bir sokakta.",
  location:
    "Metroya on dakika yürüme mesafesinde. Market, eczane ve kafeler hemen yakında. Otobüs durağı sokağın başında.",
  household:
    "Evde herkes kendi düzenine saygılı. Temizliği sırayla yapıyoruz. Hafta sonları bazen birlikte yemek yapıyoruz.",
  other:
    "Depozito bir kira bedelidir. Evi görmeye gelmek için önceden mesaj atman yeterli. Uzun süreli kalmak isteyenleri tercih ediyoruz.",
};

async function removePreviousSeed() {
  const { users } = must(
    await db.auth.admin.listUsers({ perPage: 1000 }),
    "list users",
  );
  for (const user of users) {
    if (user.email?.endsWith(`@${SEED_DOMAIN}`)) {
      must(await db.auth.admin.deleteUser(user.id), "delete user");
    }
  }
}

async function createUsers() {
  const created = [];
  for (const [index, person] of USERS.entries()) {
    const { user } = must(
      await db.auth.admin.createUser({
        email: `kullanici${index + 1}@${SEED_DOMAIN}`,
        email_confirm: true,
      }),
      "create user",
    );
    must(
      await db
        .from("profiles")
        .update({
          first_name: person.first,
          last_name: person.last,
          gender: person.gender,
          birth_year: person.year,
          occupation_status: person.status,
          phone_verified_at: index % 2 === 0 ? new Date().toISOString() : null,
          kvkk_consent_at: new Date().toISOString(),
          kvkk_text_version: "seed",
          safety_ack_at: index === 0 ? null : new Date().toISOString(),
          created_at: daysFromNow(-between(30, 400)).toISOString(),
          about: `Merhaba, ben ${person.first}. Düzenli ve sakin biriyim.`,
        })
        .eq("id", user.id),
      "update profile",
    );
    created.push({ id: user.id, ...person });
  }
  return created;
}

async function uploadPlaceholders() {
  const shades = ["#d9d9d9", "#cfcfcf", "#c4c4c4", "#e3e3e3", "#bababa", "#dedede"];
  const paths = [];
  for (const [index, shade] of shades.entries()) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
      <rect width="1200" height="900" fill="${shade}"/>
      <text x="600" y="470" font-family="Arial" font-size="64" text-anchor="middle" fill="#484848">Örnek fotoğraf</text>
    </svg>`;
    const body = await sharp(Buffer.from(svg)).webp({ quality: 70 }).toBuffer();
    const path = `seed/ornek-${index + 1}.webp`;
    must(
      await db.storage.from(BUCKET).upload(path, body, {
        contentType: "image/webp",
        upsert: true,
      }),
      "upload placeholder",
    );
    paths.push(path);
  }
  return paths;
}

function buildListing(index, users, districts) {
  const place = districts[index];
  const category = index % 5 === 3 ? "studio" : index % 5 === 4 ? "flat" : "room";
  const [neighborhood, street] = pick(place.areas);
  const owner = users[index % users.length];
  const isFixed = chance(0.3);
  const start = between(0, 60);
  const publishedHoursAgo = between(1, 24 * 20);
  const isRoom = category === "room";
  const household = isRoom ? between(2, 5) : null;
  const women = isRoom ? between(0, household - 1) : null;
  const men = isRoom ? between(0, household - 1 - women) : null;

  const baseRent = Math.round(
    place.rentBase * (category === "flat" ? 2.2 : category === "studio" ? 1.5 : 1),
  );
  const rent = Math.round((baseRent + between(-1500, 3000)) / 500) * 500;

  const title = `${locative(neighborhood)} ${pick(TITLES[category])}`.slice(0, 80);
  const amenities = AMENITIES.filter(() => chance(0.35));

  return {
    owner_id: owner.id,
    status: "active",
    category,
    rental_term: isFixed ? "fixed" : "open_ended",
    title,
    slug: slugify(title),
    province_id: place.provinceId,
    district_id: place.id,
    neighborhood,
    street,
    building_no: String(between(1, 80)),
    postal_code: "06100",
    lat: place.lat + (random() - 0.5) * 0.03,
    lng: place.lng + (random() - 0.5) * 0.03,
    available_from: dateOnly(daysFromNow(start)),
    available_to: isFixed ? dateOnly(daysFromNow(start + between(90, 270))) : null,
    building_type: pick(["apartment", "complex", "detached", "residence"]),
    floor: pick(["ground", "1", "2", "3", "4", "5", "8"]),
    room_size_m2: isRoom ? between(9, 22) : null,
    flat_size_m2: isRoom ? between(80, 140) : between(32, 120),
    room_layout: category === "flat" ? pick(["1+1", "2+1", "3+1"]) : null,
    transit_walk_min: between(2, 25),
    building_age: pick(["0-5", "5-10", "10-20", "20+"]),
    rent,
    dues: chance(0.7) ? between(4, 15) * 100 : null,
    utilities_estimate: chance(0.8) ? between(8, 25) * 100 : null,
    other_costs: null,
    deposit: chance(0.8) ? rent : null,
    utilities_included: chance(0.2),
    household_size: household,
    residents_female: women,
    residents_male: men,
    residents_age_min: isRoom ? between(19, 24) : null,
    residents_age_max: isRoom ? between(25, 34) : null,
    wanted_gender: isRoom ? pick(["any", "any", "female", "male"]) : null,
    wanted_age_min: isRoom ? 18 : null,
    wanted_age_max: isRoom ? between(28, 40) : null,
    smoking: isRoom ? pick(["allowed", "balcony", "not_allowed"]) : null,
    has_pets: isRoom ? chance(0.2) : null,
    languages: isRoom ? (chance(0.5) ? ["tr", "en"] : ["tr"]) : [],
    household_types: isRoom
      ? pick([["student"], ["employed"], ["student", "mixed"], ["women"], ["men"]])
      : [],
    desc_room: DESCRIPTIONS.room,
    desc_location: DESCRIPTIONS.location,
    desc_household: isRoom ? DESCRIPTIONS.household : null,
    desc_other: DESCRIPTIONS.other,
    word_count: 60,
    furnishing: pick(["furnished", "partial", "unfurnished"]),
    heating: pick(["combi", "central", "stove", "ac", "underfloor"]),
    internet_type: pick(["fiber", "adsl", "none"]),
    internet_speed: pick(["25", "50", "100", "1000"]),
    bathroom: pick([["shower"], ["tub"], ["shower", "private"]]),
    flooring: pick(["laminate", "parquet", "ceramic", "carpet"]),
    amenities,
    show_phone: false,
    quality_score: between(55, 95),
    published_at: new Date(Date.now() - publishedHoursAgo * 3_600_000).toISOString(),
    last_bumped_at: new Date(Date.now() - publishedHoursAgo * 3_600_000).toISOString(),
    created_at: new Date(Date.now() - publishedHoursAgo * 3_600_000).toISOString(),
    boosted_until: index === 2 ? daysFromNow(14).toISOString() : null,
    boost_source: index === 2 ? "admin_test" : null,
  };
}

async function createListings(users, placeholderPaths) {
  const province = must(
    await db.from("provinces").select("id").eq("slug", "ankara").single(),
    "province",
  );
  const rows = must(
    await db
      .from("districts")
      .select("id, slug")
      .eq("province_id", province.id)
      .in("slug", DISTRICTS.map((district) => district.slug)),
    "districts",
  );

  const weighted = DISTRICTS.flatMap((district) => {
    const row = rows.find((item) => item.slug === district.slug);
    if (!row) throw new Error(`Unknown district ${district.slug}`);
    const place = { ...district, id: row.id, provinceId: province.id };
    return Array.from({ length: district.weight * 4 }, () => place);
  });

  const listings = Array.from({ length: 40 }, (_, index) =>
    buildListing(index, users, weighted),
  );
  const inserted = must(
    await db.from("listings").insert(listings).select("id, category"),
    "insert listings",
  );

  const photos = inserted.flatMap((listing) => {
    const count = between(3, 6);
    return Array.from({ length: count }, (_, order) => ({
      listing_id: listing.id,
      storage_path: placeholderPaths[(order + between(0, 5)) % placeholderPaths.length],
      width: 1200,
      height: 900,
      sort_order: order,
    }));
  });
  must(await db.from("listing_photos").insert(photos), "insert photos");

  return inserted;
}

await removePreviousSeed();
const users = await createUsers();
const placeholders = await uploadPlaceholders();
const listings = await createListings(users, placeholders);

// Later phases extend this file through the optional hook below.
try {
  const { seedExtras } = await import("./seed-extras.mjs");
  await seedExtras({ db, users, listings, helpers: { must, between, pick, chance, daysFromNow } });
} catch (error) {
  if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
}

console.log(`Seeded ${users.length} users and ${listings.length} listings.`);
