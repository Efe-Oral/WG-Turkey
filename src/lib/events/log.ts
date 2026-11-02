import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type EventName =
  | "page_view"
  | "search"
  | "search_zero_results"
  | "filter_changed"
  | "listing_view"
  | "gallery_open"
  | "favorite_add"
  | "favorite_remove"
  | "phone_reveal"
  | "share_click"
  | "message_compose_open"
  | "message_sent"
  | "message_reply"
  | "signup_started"
  | "signup_completed"
  | "login"
  | "phone_verified"
  | "listing_draft_created"
  | "listing_submitted"
  | "listing_approved"
  | "listing_rejected"
  | "listing_published"
  | "listing_paused"
  | "listing_renewed"
  | "listing_expired"
  | "listing_rented"
  | "listing_deleted"
  | "report_created"
  | "boost_interest"
  | "safety_ack"
  | "empty_city_cta_click";

export type EventInput = {
  name: EventName;
  userId?: string | null;
  sessionId?: string | null;
  listingId?: string | null;
  conversationId?: string | null;
  provinceId?: string | null;
  districtId?: string | null;
  props?: Record<string, unknown>;
  referrerSource?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  deviceType?: string | null;
};

function toRow(event: EventInput) {
  return {
    name: event.name,
    user_id: event.userId ?? null,
    session_id: event.sessionId ?? null,
    listing_id: event.listingId ?? null,
    conversation_id: event.conversationId ?? null,
    province_id: event.provinceId ?? null,
    district_id: event.districtId ?? null,
    props: event.props ?? {},
    referrer_source: event.referrerSource ?? null,
    utm_source: event.utmSource ?? null,
    utm_medium: event.utmMedium ?? null,
    utm_campaign: event.utmCampaign ?? null,
    device_type: event.deviceType ?? null,
  };
}

/** Analytics must never break the action that triggered it. */
export async function logEvents(events: EventInput[]): Promise<void> {
  if (events.length === 0) return;

  try {
    await createAdminClient().from("events").insert(events.map(toRow));
  } catch {
    // Losing an event is better than failing the user's request.
  }
}

export async function logEvent(event: EventInput): Promise<void> {
  await logEvents([event]);
}
