"use client";

import { useEffect } from "react";

export const RESULTS_STORAGE_KEY = "search_results";

export type StoredResults = {
  ids: number[];
  total: number;
  href: string;
};

/** Keeps the result order for "Önceki ilan" and "Sonraki ilan" on detail pages. */
export function RecordResults({ ids, total }: { ids: number[]; total: number }) {
  useEffect(() => {
    const stored: StoredResults = {
      ids,
      total,
      href: window.location.pathname + window.location.search,
    };
    sessionStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(stored));
  }, [ids, total]);

  return null;
}
