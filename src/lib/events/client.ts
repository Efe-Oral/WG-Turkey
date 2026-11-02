"use client";

const SESSION_KEY = "ea_session";
const ATTRIBUTION_KEY = "ea_attribution";
const FLUSH_MS = 3000;

export type ClientEventName =
  | "page_view"
  | "search"
  | "search_zero_results"
  | "filter_changed"
  | "listing_view"
  | "gallery_open"
  | "share_click"
  | "signup_started"
  | "signup_completed"
  | "login"
  | "empty_city_cta_click";

type ClientEvent = {
  name: ClientEventName;
  listingId?: string;
  provinceId?: string;
  districtId?: string;
  props?: Record<string, string | number | boolean | null | undefined>;
};

type Attribution = {
  referrerSource: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

/** Random per tab, gone when the tab closes. Section 12.1: no cookie. */
function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function referrerSource(): string | null {
  if (!document.referrer) return null;

  const host = new URL(document.referrer).hostname.replace(/^www\./, "");
  if (host === window.location.hostname) return null;
  if (host.includes("google.")) return "google";
  if (host.includes("instagram.")) return "instagram";
  if (host.includes("whatsapp.") || host === "wa.me") return "whatsapp";
  if (host.includes("facebook.")) return "facebook";
  return host;
}

/** Read once per session: later pages no longer carry the UTM parameters. */
function attribution(): Attribution {
  const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
  if (stored) return JSON.parse(stored) as Attribution;

  const query = new URLSearchParams(window.location.search);
  const value: Attribution = {
    referrerSource: referrerSource(),
    utmSource: query.get("utm_source"),
    utmMedium: query.get("utm_medium"),
    utmCampaign: query.get("utm_campaign"),
  };
  sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(value));

  return value;
}

let queue: ClientEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

function flush(): void {
  clearTimeout(timer);
  timer = undefined;
  if (queue.length === 0) return;

  const body = JSON.stringify({
    sessionId: sessionId(),
    deviceType: window.innerWidth < 768 ? "mobile" : "desktop",
    ...attribution(),
    events: queue,
  });
  queue = [];

  // sendBeacon survives leaving the page and never blocks the UI.
  const sent = navigator.sendBeacon?.(
    "/api/events",
    new Blob([body], { type: "application/json" }),
  );
  if (!sent) {
    void fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }
}

export function track(event: ClientEvent): void {
  queue.push(event);
  timer ??= setTimeout(flush, FLUSH_MS);

  window.addEventListener("pagehide", flush, { once: true });
}
