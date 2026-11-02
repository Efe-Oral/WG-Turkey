import "server-only";
import type { Viewer } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMPTY_FORM, type ListingFormValues } from "./schema";

type Row = Record<string, unknown>;

/** Database row to form values: numbers become strings, nulls become blanks. */
function rowToFormValues(row: Row): ListingFormValues {
  const entries = (Object.keys(EMPTY_FORM) as (keyof ListingFormValues)[]).map(
    (key) => {
      const value = row[key];
      const blank = EMPTY_FORM[key];

      if (value === null || value === undefined) return [key, blank];
      if (typeof blank === "string") return [key, String(value)];
      return [key, value];
    },
  );

  return Object.fromEntries(entries) as ListingFormValues;
}

export type EditableListing = {
  id: string;
  publicNumber: number;
  status: string;
  values: ListingFormValues;
  photos: { id: string; path: string }[];
};

/** Includes private fields, so it is only ever loaded for the owner. */
export async function getEditableListing(
  publicNumber: number,
  viewer: Viewer,
): Promise<EditableListing | null> {
  const db = createAdminClient();

  const { data: row } = await db
    .from("listings")
    .select("*")
    .eq("public_number", publicNumber)
    .eq("owner_id", viewer.id)
    .neq("status", "deleted")
    .maybeSingle();
  if (!row) return null;

  const { data: photos } = await db
    .from("listing_photos")
    .select("id, storage_path")
    .eq("listing_id", row.id)
    .order("sort_order");

  return {
    id: row.id,
    publicNumber: row.public_number,
    status: row.status,
    values: rowToFormValues(row),
    photos: (photos ?? []).map((photo) => ({
      id: photo.id,
      path: photo.storage_path,
    })),
  };
}
