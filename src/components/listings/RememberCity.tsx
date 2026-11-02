"use client";

import { useEffect } from "react";
import { LAST_CITY_COOKIE } from "@/lib/site";

const ONE_YEAR_IN_SECONDS = 31_536_000;

/** Lets /ilanlar and the homepage links return to the last city. */
export function RememberCity({ slug }: { slug: string }) {
  useEffect(() => {
    document.cookie = `${LAST_CITY_COOKIE}=${slug}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; samesite=lax`;
  }, [slug]);

  return null;
}
