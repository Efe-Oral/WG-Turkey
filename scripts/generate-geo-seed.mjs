// Builds the province and district seed migration.
//
// Names and plate codes: turkiye-api, MIT licensed.
//   https://api.turkiyeapi.dev/v1/provinces?fields=id,name,coordinates,districts
// District coordinates: Wikidata, CC0.
//
// Usage: node scripts/generate-geo-seed.mjs <dir with ref.json, prov.json, dist.json>
// scripts/geo-coordinate-overrides.json holds districts missing from that
// Wikidata query, as { "<province>|<district>": [lat, lng] }. They were found
// through the Wikidata search API; Yedisu was set by hand.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUTPUT = "supabase/migrations/20261102000200_seed_provinces_districts.sql";
const MAX_DISTANCE_KM = 260;
const RESERVED_SECOND_SEGMENTS = new Set(["oda", "studyo", "daire"]);

const SLUG_MAP = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

const slugify = (text) =>
  text
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (char) => SLUG_MAP[char] ?? char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Wikidata labels carry suffixes such as "Çeşme (ilçe)" or "Kemer district".
const normalize = (label) =>
  label
    .toLocaleLowerCase("tr-TR")
    .replace(/\s*\(.*\)$/, "")
    .replace(/,.*$/, "")
    .replace(/'(in|ın|un|ün|nin|nın|nun|nün)$/, "")
    .replace(/ (ilçesi|district|bölgesi)$/, "")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .trim();

// Wikidata name for a district, where it differs from the official one.
const ALIASES = {
  "Ankara|Kahramankazan": "kazan",
  "Erzurum|Aziziye": "ılıca",
  "Kayseri|Yahyalı": "yahyal",
  "Konya|Selçuklu": "selçuklular",
  "Ordu|Altınordu": "ordu",
  "Samsun|19 Mayıs": "ondokuzmayıs",
  "Tekirdağ|Marmaraereğlisi": "marmara ereğlisi",
  "Van|Tuşba": "tuşpa",
  "Zonguldak|Ereğli": "karadeniz ereğli",
};

const distanceKm = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

const parsePoint = (wkt) => {
  const match = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(wkt ?? "");
  return match ? { lat: Number(match[2]), lng: Number(match[1]) } : null;
};

const sqlText = (text) => `'${text.replace(/'/g, "''")}'`;
const round = (value) => Number(value.toFixed(5));

const dir = process.argv[2];
if (!dir) throw new Error("Pass the directory holding ref.json and dist.json.");

const read = (name) => JSON.parse(readFileSync(join(dir, name), "utf8"));
const provinces = read("ref.json").data;
const wikidata = read("dist.json").results.bindings;
const wikidataProvinces = read("prov.json").results.bindings;
const extra = JSON.parse(readFileSync("scripts/geo-coordinate-overrides.json", "utf8"));

// Group Wikidata rows by the normalized name, keeping every candidate point.
const candidates = new Map();
for (const row of wikidata) {
  const point = parsePoint(row.coord?.value);
  if (!point) continue;
  const key = normalize(row.dLabel.value);
  if (!candidates.has(key)) candidates.set(key, []);
  candidates.get(key).push({ ...point, provinceQid: row.p?.value ?? null });
}

// Matched by name: Wikidata's plate codes are wrong for a few provinces.
const qidByProvince = new Map(
  wikidataProvinces.map((row) => [normalize(row.pLabel.value), row.p.value]),
);

const unresolved = [];
const provinceRows = [];
const districtRows = [];

for (const province of [...provinces].sort((a, b) => a.id - b.id)) {
  const center = {
    lat: province.coordinates.latitude,
    lng: province.coordinates.longitude,
  };
  const provinceSlug = slugify(province.name);
  provinceRows.push({ ...center, name: province.name, slug: provinceSlug, plate: province.id });

  const seenSlugs = new Set();
  for (const district of province.districts) {
    const key = `${province.name}|${district.name}`;
    const slug = slugify(district.name);
    if (seenSlugs.has(slug)) throw new Error(`Duplicate slug: ${key}`);
    if (RESERVED_SECOND_SEGMENTS.has(slug)) throw new Error(`Slug clashes with a category: ${key}`);
    seenSlugs.add(slug);

    let point = null;
    if (extra[key]) {
      point = { lat: extra[key][0], lng: extra[key][1] };
    } else {
      // A central "Merkez" district takes the name of its province in Wikidata.
      const names =
        district.name === "Merkez"
          ? [normalize(province.name), "merkez"]
          : [ALIASES[key] ?? normalize(district.name)];
      const nearby = names
        .flatMap((name) => candidates.get(name) ?? [])
        .map((candidate) => ({ candidate, km: distanceKm(center, candidate) }))
        .filter(({ km }) => km <= MAX_DISTANCE_KM)
        .sort((a, b) => a.km - b.km);
      // Names repeat across provinces, so an item tagged with this province wins.
      const qid = qidByProvince.get(normalize(province.name));
      const tagged = nearby.find(({ candidate }) => candidate.provinceQid === qid);
      point = (tagged ?? nearby[0])?.candidate ?? null;
    }

    if (!point) unresolved.push(key);
    districtRows.push({ plate: province.id, name: district.name, slug, point });
  }
}

if (provinceRows.length !== 81) throw new Error(`Expected 81 provinces, got ${provinceRows.length}`);
if (districtRows.length !== 973) throw new Error(`Expected 973 districts, got ${districtRows.length}`);

if (unresolved.length > 0) {
  console.error(`No coordinates for ${unresolved.length} districts:`);
  console.error(unresolved.join("\n"));
  process.exit(1);
}

const provinceValues = provinceRows
  .map(
    (row) =>
      `  (${sqlText(row.name)}, ${sqlText(row.slug)}, ${row.plate}, ${round(row.lat)}, ${round(row.lng)})`,
  )
  .join(",\n");

const districtValues = districtRows
  .map(
    (row) =>
      `  (${row.plate}, ${sqlText(row.name)}, ${sqlText(row.slug)}, ${round(row.point.lat)}, ${round(row.point.lng)})`,
  )
  .join(",\n");

const sql = `-- Generated by scripts/generate-geo-seed.mjs. Do not edit by hand.
--
-- Reference data, so it belongs in every environment including production.
-- 81 provinces and 973 districts.
-- Sources:
--   Names and plate codes: turkiye-api, MIT licensed
--     https://github.com/ubeydeozdmr/turkiye-api
--   Province coordinates: turkiye-api
--   District coordinates: Wikidata, CC0
--     https://www.wikidata.org (instances of Q1147395, district of Turkey)
--   Fetched 2026-11-02.

insert into public.provinces (name, slug, plate_code, lat, lng) values
${provinceValues};

insert into public.districts (province_id, name, slug, lat, lng)
select p.id, d.name, d.slug, d.lat, d.lng
from (values
${districtValues}
) as d(plate_code, name, slug, lat, lng)
join public.provinces p on p.plate_code = d.plate_code;
`;

writeFileSync(OUTPUT, sql);
console.log(`Wrote ${OUTPUT}: ${provinceRows.length} provinces, ${districtRows.length} districts.`);
