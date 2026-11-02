"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { track, type ClientEventName } from "@/lib/events/client";

function pageType(path: string): string {
  if (path === "/") return "home";
  if (path.startsWith("/ilan/")) return "listing";
  if (path.startsWith("/ilan-ver")) return "post";
  if (path.startsWith("/mesaj")) return "messages";
  if (path.startsWith("/hesabim")) return "account";
  if (path.startsWith("/admin")) return "admin";
  if (path.startsWith("/guvenlik")) return "safety";
  return "results";
}

/** Page views, once per navigation. */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track({ name: "page_view", props: { page_type: pageType(pathname) } });
  }, [pathname]);

  return null;
}

type TrackOnceProps = {
  name: ClientEventName;
  listingId?: string;
  provinceId?: string;
  districtId?: string;
  props?: Record<string, string | number | boolean | null | undefined>;
  /** A new key logs the event again, for example a new search. */
  eventKey?: string;
};

export function TrackOnce({
  name,
  listingId,
  provinceId,
  districtId,
  props,
  eventKey = "",
}: TrackOnceProps) {
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${name}:${listingId}:${eventKey}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    track({ name, listingId, provinceId, districtId, props });
  }, [name, listingId, provinceId, districtId, props, eventKey]);

  return null;
}
