import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const MODERATION_FLAGS = [
  "low_rent",
  "contact_info",
  "scam_words",
  "duplicate_photo",
  "too_many_listings",
] as const;

export type ModerationFlag = (typeof MODERATION_FLAGS)[number];

const MIN_LISTINGS_FOR_MEDIAN = 10;
const LOW_RENT_RATIO = 0.4;
const MAX_LISTINGS_PER_DAY = 3;

const PHONE_PATTERN = /(\+?90[\s.-]*)?\(?0?5\d{2}\)?[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/;
const IBAN_PATTERN = /\bTR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/i;
const URL_PATTERN = /(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|net|org|io|me|tr)\b/i;
const SCAM_PATTERN = /kapora|western union|yurt ?dışındayım/i;

type ListingForChecks = {
  id: string;
  owner_id: string;
  district_id: string | null;
  rent: number | null;
  texts: (string | null)[];
};

/** Section 10. A flagged listing waits for review even if it is not the first. */
export async function computeModerationFlags(
  listing: ListingForChecks,
): Promise<ModerationFlag[]> {
  const db = createAdminClient();
  const flags: ModerationFlag[] = [];
  const text = listing.texts.filter(Boolean).join("\n");

  if (
    PHONE_PATTERN.test(text) ||
    IBAN_PATTERN.test(text) ||
    URL_PATTERN.test(text)
  ) {
    flags.push("contact_info");
  }
  if (SCAM_PATTERN.test(text.toLocaleLowerCase("tr-TR"))) {
    flags.push("scam_words");
  }

  if (listing.district_id && listing.rent !== null) {
    const { data } = await db
      .from("listings")
      .select("rent")
      .eq("district_id", listing.district_id)
      .eq("status", "active")
      .neq("id", listing.id)
      .not("rent", "is", null);

    const rents = (data ?? []).map((row) => row.rent as number).sort((a, b) => a - b);
    if (rents.length >= MIN_LISTINGS_FOR_MEDIAN) {
      const median = rents[Math.floor(rents.length / 2)]!;
      if (listing.rent < median * LOW_RENT_RATIO) flags.push("low_rent");
    }
  }

  const { data: ownPhotos } = await db
    .from("listing_photos")
    .select("phash")
    .eq("listing_id", listing.id)
    .not("phash", "is", null);

  const hashes = (ownPhotos ?? []).map((photo) => photo.phash as string);
  if (hashes.length > 0) {
    const { data: matches } = await db
      .from("listing_photos")
      .select("listing_id, listings!inner(owner_id)")
      .in("phash", hashes)
      .neq("listings.owner_id", listing.owner_id)
      .limit(1);

    if ((matches ?? []).length > 0) flags.push("duplicate_photo");
  }

  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", listing.owner_id)
    .gte("created_at", dayAgo);

  if ((count ?? 0) > MAX_LISTINGS_PER_DAY) flags.push("too_many_listings");

  return flags;
}
