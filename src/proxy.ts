import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DAY_MS = 86_400_000;
const GONE_AFTER_DAYS = 30;

/** A page render cannot answer 410, so old paused and rented listings stop here. */
async function isGone(publicNumber: string): Promise<boolean> {
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

/** Keeps the login alive. Visitors with no session cost no network call. */
async function refreshSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const hasSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));
  if (!hasSession) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export async function proxy(request: NextRequest) {
  const publicNumber = /^\/ilan\/(\d{1,15})(?:-[^/]*)?$/.exec(
    request.nextUrl.pathname,
  )?.[1];

  if (publicNumber && (await isGone(publicNumber))) {
    return new NextResponse("Bu ilan artık yayında değil.", {
      status: 410,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return refreshSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|robots.txt|sitemap.xml).*)"],
};
