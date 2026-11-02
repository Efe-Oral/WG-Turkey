import { NextResponse, type NextRequest } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { createRenewUrl } from "@/lib/listings/renew";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY_MS = 86_400_000;
const EXPIRES_AFTER_DAYS = 30;
const WARN_BEFORE_DAYS = 3;

/**
 * Called once a day by Vercel Cron (vercel.json). Emails owners three days
 * before a listing expires. Expiry itself runs in the database (pg_cron).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse(null, { status: 401 });
  }

  const db = createAdminClient();
  const age = EXPIRES_AFTER_DAYS - WARN_BEFORE_DAYS;
  const windowEnd = new Date(Date.now() - age * DAY_MS).toISOString();
  const windowStart = new Date(Date.now() - (age + 1) * DAY_MS).toISOString();

  const { data: listings } = await db
    .from("listings")
    .select("id, title, owner_id")
    .eq("status", "active")
    .gte("last_bumped_at", windowStart)
    .lt("last_bumped_at", windowEnd);

  let sent = 0;

  for (const listing of listings ?? []) {
    const { data } = await db.auth.admin.getUserById(listing.owner_id);
    if (!data.user?.email) continue;

    const ok = await sendEmail({
      to: data.user.email,
      subject: "EvArkadaşıAra: ilanın 3 gün sonra yayından kalkacak",
      text: [
        `"${listing.title}" ilanın 3 gün sonra yayından kalkacak.`,
        "",
        `Yayında tut: ${createRenewUrl(listing.id)}`,
      ].join("\n"),
    });
    if (ok) sent += 1;
  }

  return NextResponse.json({ sent });
}
