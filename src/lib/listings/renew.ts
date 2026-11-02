import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { logEvent } from "@/lib/events/log";
import { absoluteUrl } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

const LINK_LIFETIME_MS = 14 * 86_400_000;

function secret(): string {
  return process.env.RENEW_TOKEN_SECRET ?? process.env.SUPABASE_SECRET_KEY!;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** The email link works without login, so it is signed and expires. */
export function createRenewUrl(listingId: string): string {
  const expires = Date.now() + LINK_LIFETIME_MS;
  const payload = `${listingId}.${expires}`;

  return absoluteUrl(`/ilan/yenile?t=${payload}.${sign(payload)}`);
}

function readToken(token: string): string | null {
  const [listingId, expires, signature] = token.split(".");
  if (!listingId || !expires || !signature) return null;
  if (Date.now() > Number(expires)) return null;

  const expected = Buffer.from(sign(`${listingId}.${expires}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length) return null;

  return timingSafeEqual(expected, received) ? listingId : null;
}

/** "Yayında tut": resets the 30-day clock. Only for active or expired listings. */
export async function renewFromToken(token: string): Promise<boolean> {
  const listingId = readToken(token);
  if (!listingId) return false;

  const db = createAdminClient();
  const { data: listing } = await db
    .from("listings")
    .select("id, owner_id, status, moderation_flags")
    .eq("id", listingId)
    .in("status", ["active", "paused"])
    .maybeSingle();
  if (!listing) return false;

  const { error } = await db
    .from("listings")
    .update({
      status: "active",
      paused_at: null,
      last_bumped_at: new Date().toISOString(),
    })
    .eq("id", listingId);
  if (error) return false;

  await logEvent({
    name: "listing_renewed",
    userId: listing.owner_id,
    listingId,
    props: { source: "email" },
  });

  return true;
}
