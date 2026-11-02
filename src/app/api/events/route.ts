import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getViewer } from "@/lib/auth/viewer";
import { logEvents } from "@/lib/events/log";

// Names the browser may report. Everything else is logged by the server itself.
const CLIENT_EVENTS = [
  "page_view",
  "search",
  "search_zero_results",
  "filter_changed",
  "listing_view",
  "gallery_open",
  "share_click",
  "signup_started",
  "signup_completed",
  "login",
  "empty_city_cta_click",
] as const;

const text = z.string().max(100).nullish();

const batchSchema = z.object({
  sessionId: z.uuid(),
  deviceType: z.enum(["mobile", "desktop"]),
  referrerSource: text,
  utmSource: text,
  utmMedium: text,
  utmCampaign: text,
  events: z
    .array(
      z.object({
        name: z.enum(CLIENT_EVENTS),
        listingId: z.uuid().optional(),
        provinceId: z.uuid().optional(),
        districtId: z.uuid().optional(),
        props: z
          .record(
            z.string().max(40),
            z.union([z.string().max(200), z.number(), z.boolean(), z.null()]),
          )
          .optional(),
      }),
    )
    .max(30),
});

export async function POST(request: NextRequest) {
  const parsed = batchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const { events, ...context } = parsed.data;
  const viewer = await getViewer();

  await logEvents(
    events.map((event) => ({
      ...event,
      ...context,
      userId: viewer?.id ?? null,
    })),
  );

  return new NextResponse(null, { status: 204 });
}
