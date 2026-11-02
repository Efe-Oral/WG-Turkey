const BUCKET = "listing-photos";

export function photoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** "14290400-cankaya-oda" gives 14290400, anything else gives null. */
export function parseListingParam(param: string): number | null {
  const match = /^(\d{1,15})(?:-|$)/.exec(param);
  return match ? Number(match[1]) : null;
}

export function listingPath(listing: {
  public_number: number;
  slug: string;
}): string {
  return `/ilan/${listing.public_number}${listing.slug ? `-${listing.slug}` : ""}`;
}
