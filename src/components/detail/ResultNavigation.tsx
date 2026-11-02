"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  RESULTS_STORAGE_KEY,
  type StoredResults,
} from "@/components/listings/RecordResults";

const subscribe = () => () => {};
const readStorage = () => sessionStorage.getItem(RESULTS_STORAGE_KEY);
const readServer = () => null;

/** Only appears when the visitor arrived from a search. */
export function ResultNavigation({ publicNumber }: { publicNumber: number }) {
  const t = useTranslations("detail");
  const raw = useSyncExternalStore(subscribe, readStorage, readServer);

  if (!raw) return null;

  const stored = JSON.parse(raw) as StoredResults;
  const index = stored.ids.indexOf(publicNumber);
  if (index === -1) return null;

  const previous = stored.ids[index - 1];
  const next = stored.ids[index + 1];

  return (
    <nav className="mb-3 flex items-center justify-between text-meta">
      {previous ? <Link href={`/ilan/${previous}`}>{t("previous")}</Link> : <span />}
      <Link href={stored.href} className="tabular-nums">
        {t("results", { count: stored.total })}
      </Link>
      {next ? <Link href={`/ilan/${next}`}>{t("next")}</Link> : <span />}
    </nav>
  );
}
