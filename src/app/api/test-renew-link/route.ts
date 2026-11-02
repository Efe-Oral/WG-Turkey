import { NextResponse, type NextRequest } from "next/server";
import { createRenewUrl } from "@/lib/listings/renew";

/** Only exists with ENABLE_DEV_UI, so smoke tests can get a signed link. */
export function GET(request: NextRequest) {
  const listingId = request.nextUrl.searchParams.get("id");

  if (process.env.ENABLE_DEV_UI !== "true" || !listingId) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({ url: createRenewUrl(listingId) });
}
