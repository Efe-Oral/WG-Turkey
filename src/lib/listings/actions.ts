"use server";

import { z } from "zod";
import { listingPath } from "./detail";
import { findByPublicNumber } from "./search";

const publicNumberSchema = z.coerce.number().int().positive().max(999_999_999);

export async function findListingByNumber(
  input: string,
): Promise<string | null> {
  const parsed = publicNumberSchema.safeParse(input.trim());
  if (!parsed.success) return null;

  const listing = await findByPublicNumber(parsed.data);
  return listing ? listingPath(listing) : null;
}
