import { NextResponse, type NextRequest } from "next/server";
import { GONE_AFTER_DAYS } from "@/lib/listings/constants";
import { parseListingParam } from "@/lib/listings/detail";

const DAY_MS = 86_400_000;

/** A page render cannot answer 410, so old paused and rented listings stop here. */
async function isGone(publicNumber: number): Promise<boolean> {
  const url = new URL(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/public_listings`,
  );
  url.searchParams.set("public_number", `eq.${publicNumber}`);
  url.searchParams.set("select", "status,paused_at,rented_at");

  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const response = await fetch(url, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    next: { revalidate: 300 },
  });
  if (!response.ok) return false;

  const [listing] = (await response.json()) as {
    status: string;
    paused_at: string | null;
    rented_at: string | null;
  }[];
  if (!listing || listing.status === "active") return false;

  const since = listing.status === "rented" ? listing.rented_at : listing.paused_at;
  return (
    since !== null &&
    Date.now() - new Date(since).getTime() > GONE_AFTER_DAYS * DAY_MS
  );
}

export async function proxy(request: NextRequest) {
  const param = /^\/ilan\/([^/]+)$/.exec(request.nextUrl.pathname)?.[1];
  const publicNumber = param ? parseListingParam(param) : null;

  if (publicNumber && (await isGone(publicNumber))) {
    return new NextResponse("Bu ilan artık yayında değil.", {
      status: 410,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/ilan/:path*"],
};
